-- assumes that postgres has pgvector extension installed (0.8.7)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS news;

-- pipeline step
-- python script loads data to the news.gnews_article table

CREATE TABLE news.gnews_article (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- GNews article identifier
    gnews_id            text NOT NULL,

    -- Complete original article JSON
    data                jsonb NOT NULL,

    -- Collection metadata
    category            text NOT NULL,
    collection_date     date NOT NULL,
    language            text NOT NULL DEFAULT 'en',
    country             text NOT NULL DEFAULT 'us',

    -- Ingestion metadata
    first_ingested_at   timestamptz NOT NULL DEFAULT now(),
    last_ingested_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_gnews_article_collection
        UNIQUE (
            gnews_id,
            category,
            collection_date,
            language,
            country
        )
);

CREATE INDEX ix_gnews_article_collection
    ON news.gnews_article (category, collection_date);

CREATE INDEX ix_gnews_article_data
    ON news.gnews_article USING gin (data);

-- pipeline step
-- extract article title, desc, content, etc.
    
CREATE OR REPLACE VIEW news.v_gnews_article AS
SELECT
    -- Internal identification
    a.id,
    a.gnews_id,

    -- Collection metadata
    a.category,
    a.collection_date,
    a.language,
    a.country,

    -- Article attributes
    a.data ->> 'title' AS title,
    a.data ->> 'description' AS description,
    a.data ->> 'content' AS content,
    a.data ->> 'url' AS url,
    a.data ->> 'image' AS image_url,
    (a.data ->> 'publishedAt')::timestamptz AS published_at,
    a.data ->> 'lang' AS article_language,

    -- Publisher attributes
    a.data #>> '{source,id}' AS source_id,
    a.data #>> '{source,name}' AS source_name,
    a.data #>> '{source,url}' AS source_url,
    a.data #>> '{source,country}' AS source_country,

    -- Ingestion metadata
    a.first_ingested_at,
    a.last_ingested_at

FROM news.gnews_article a;


-- pipeline step
-- dedupe articles by title and description, one view per stage

-- normalize titles and descriptions into comparison keys
CREATE OR REPLACE VIEW news.v_gnews_article_normalized AS
SELECT
    a.*,

    -- Map non-breaking spaces and curly quotes to plain
    -- equivalents, collapse whitespace, and ignore case.
    lower(btrim(regexp_replace(
        translate(a.title, E' ‘’“”', ' ''''""'),
        '\s+', ' ', 'g'
    ))) AS title_key,

    lower(btrim(regexp_replace(
        translate(a.description, E' ‘’“”', ' ''''""'),
        '\s+', ' ', 'g'
    ))) AS description_key

FROM news.v_gnews_article a;


-- group articles whose keys match and rank them within each group
CREATE OR REPLACE VIEW news.v_gnews_article_ranked AS
SELECT
    n.*,

    COUNT(*) OVER w_group AS duplicates_count,

    -- Outlets carrying the article, earliest publication first.
    array_agg(source_name) OVER w_ordered AS duplicate_source_names,

    ROW_NUMBER() OVER w_ordered AS rn

FROM news.v_gnews_article_normalized n

WINDOW
    w_group AS (
        PARTITION BY
            category,
            collection_date,
            language,
            country,
            title_key,
            description_key
    ),
    w_ordered AS (
        w_group
        ORDER BY
            published_at ASC,
            gnews_id ASC,
            id ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    );


-- keep the earliest article in each group
CREATE OR REPLACE VIEW news.v_gnews_article_deduped AS
SELECT
    id,
    gnews_id,

    category,
    collection_date,
    language,
    country,

    title,
    description,

    duplicates_count,
    duplicate_source_names,

    content,
    url,
    image_url,
    published_at,
    article_language,

    source_id,
    source_name,
    source_url,
    source_country,

    first_ingested_at,
    last_ingested_at

FROM news.v_gnews_article_ranked
WHERE rn = 1;


-- pipeline step
-- the daily processing set: one row per article per category and
-- UTC publication date

CREATE OR REPLACE VIEW news.v_gnews_article_daily AS
SELECT
    id,
    gnews_id,

    category,
    published_date,

    collection_date,
    language,
    country,

    title,
    description,

    duplicates_count,
    duplicate_source_names,

    content,
    url,
    image_url,
    published_at,
    article_language,

    source_id,
    source_name,
    source_url,
    source_country,

    first_ingested_at,
    last_ingested_at

FROM (
    SELECT
        d.*,
        (d.published_at AT TIME ZONE 'UTC')::date AS published_date,

        -- An article collected more than once, for another country
        -- or language say, is kept from its earliest collection.
        ROW_NUMBER() OVER (
            PARTITION BY
                d.category,
                (d.published_at AT TIME ZONE 'UTC')::date,
                d.gnews_id
            ORDER BY
                d.collection_date ASC,
                d.id ASC
        ) AS daily_rn

    FROM news.v_gnews_article_deduped d
) d
WHERE daily_rn = 1;


-- pipeline step
-- python script embeds each article's title, description and the
-- opening of its content

CREATE TABLE news.gnews_article_embedding (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    gnews_article_id bigint NOT NULL
        REFERENCES news.gnews_article(id),

    model text NOT NULL,

    input_hash text NOT NULL,

    embedding vector(384) NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_gnews_article_embedding
        UNIQUE (gnews_article_id, model, input_hash)
);


-- pipeline step
-- each daily article's latest embedding per model, with its fields

CREATE OR REPLACE VIEW news.v_gnews_article_embedded AS
SELECT
    a.*,
    e.model AS embedding_model,
    e.input_hash AS embedding_input_hash,
    e.embedding,
    e.created_at AS embedded_at

FROM news.v_gnews_article_daily a

-- Embeddings of text an article has since changed stay in the table
-- but not here.
CROSS JOIN LATERAL (
    SELECT DISTINCT ON (model) *
    FROM news.gnews_article_embedding
    WHERE gnews_article_id = a.id
    ORDER BY model, created_at DESC, id DESC
) e;


-- pipeline step
-- tf-idf corpus per category and date

CREATE TABLE news.gnews_article_tfidf_corpus (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    category text NOT NULL,
    published_date date NOT NULL,

    configuration jsonb NOT NULL,
    vocabulary jsonb NOT NULL,
    idf_weights double precision[] NOT NULL,

    document_count integer NOT NULL
        CHECK (document_count > 0),

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_gnews_tfidf_corpus
        UNIQUE (category, published_date)
);

-- pipeline step
-- tf-idf values per article
CREATE TABLE news.gnews_article_tfidf (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    corpus_id bigint NOT NULL
        REFERENCES news.gnews_article_tfidf_corpus(id)
        ON DELETE CASCADE,

    gnews_article_id bigint NOT NULL
        REFERENCES news.gnews_article(id),

    input_hash text NOT NULL,

    tfidf sparsevec NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_gnews_article_tfidf
        UNIQUE (corpus_id, gnews_article_id)
);


-- pipeline step
-- tf-idf values are linked back to daily articles
CREATE OR REPLACE VIEW news.v_gnews_article_tfidf AS

SELECT
    a.*,

    c.id AS tfidf_corpus_id,
    c.configuration AS tfidf_configuration,
    c.document_count AS tfidf_document_count,

    t.input_hash AS tfidf_input_hash,
    t.tfidf,
    t.created_at AS tfidf_created_at

FROM news.v_gnews_article_daily a

JOIN news.gnews_article_tfidf t
    ON t.gnews_article_id = a.id

JOIN news.gnews_article_tfidf_corpus c
    ON c.id = t.corpus_id
   AND c.category = a.category
   AND c.published_date = a.published_date;


-- pipeline step
-- similarity of every pair of articles in a category and UTC
-- publication date

CREATE TABLE news.gnews_article_daily_similarity (
    category text NOT NULL,
    published_date date NOT NULL,

    article_a_id bigint NOT NULL
        REFERENCES news.gnews_article(id),

    article_b_id bigint NOT NULL
        REFERENCES news.gnews_article(id),

    -- The vectors compared: an embedding model, and the day's
    -- TF-IDF corpus. Rebuilding the corpus removes its pairs.
    embedding_model text NOT NULL,

    tfidf_corpus_id bigint NOT NULL
        REFERENCES news.gnews_article_tfidf_corpus(id)
        ON DELETE CASCADE,

    embedding_cosine_similarity double precision NOT NULL,

    -- NULL when either article shares no terms with the corpus
    -- vocabulary, which leaves its TF-IDF vector empty.
    tfidf_cosine_similarity double precision,

    calculated_at timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (
        category,
        published_date,
        article_a_id,
        article_b_id
    ),

    -- Each unordered pair is stored once.
    CONSTRAINT ck_gnews_article_daily_similarity_pair
        CHECK (article_a_id < article_b_id)
);


-- pipeline step
-- article pairs with their titles and outlets

CREATE OR REPLACE VIEW news.v_gnews_article_daily_similarity AS
SELECT
    s.category,
    s.published_date,

    s.article_a_id,
    a.title AS article_a_title,
    a.source_name AS article_a_source_name,

    s.article_b_id,
    b.title AS article_b_title,
    b.source_name AS article_b_source_name,

    s.embedding_cosine_similarity,
    s.tfidf_cosine_similarity,

    s.embedding_model,
    s.tfidf_corpus_id,
    s.calculated_at

FROM news.gnews_article_daily_similarity s

JOIN news.v_gnews_article a
    ON a.id = s.article_a_id

JOIN news.v_gnews_article b
    ON b.id = s.article_b_id;


-- pipeline step
-- python script groups each day's articles into stories

CREATE TABLE news.gnews_story (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    category text NOT NULL,
    published_date date NOT NULL,

    -- How the story's articles were grouped: the method, its
    -- settings and the story's cohesion.
    clustering_method text NOT NULL,
    clustering_version text NOT NULL,
    clustering_metadata jsonb NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_gnews_story_day
    ON news.gnews_story (category, published_date);


CREATE TABLE news.gnews_story_article (
    story_id bigint NOT NULL
        REFERENCES news.gnews_story(id)
        ON DELETE CASCADE,

    gnews_article_id bigint NOT NULL
        REFERENCES news.gnews_article(id),

    -- 'model' when clustering placed the article, 'editor' when an
    -- editor's correction did.
    assigned_by text NOT NULL
        CHECK (assigned_by IN ('model', 'editor')),

    PRIMARY KEY (story_id, gnews_article_id),

    -- An article belongs to one story.
    CONSTRAINT uq_gnews_story_article
        UNIQUE (gnews_article_id)
);


-- editorial input
-- editors' corrections to story assignments, applied by the app
-- straight away and again whenever stories are clustered

CREATE TABLE news.gnews_story_article_override (
    gnews_article_id bigint PRIMARY KEY
        REFERENCES news.gnews_article(id),

    -- The article to share a story with, or NULL for a story of
    -- its own.
    together_with_article_id bigint
        REFERENCES news.gnews_article(id),

    note text,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ck_gnews_story_article_override_other
        CHECK (together_with_article_id <> gnews_article_id)
);


-- pipeline step
-- one row per story, with its articles, outlets and lead article

CREATE OR REPLACE VIEW news.v_gnews_story AS
WITH story_article AS (
    SELECT
        sa.story_id,
        sa.assigned_by,
        a.*
    FROM news.gnews_story_article sa
    JOIN news.v_gnews_article_daily a
        ON a.id = sa.gnews_article_id
),

-- The article carried by the most outlets leads the story, then
-- the earliest published.
lead AS (
    SELECT DISTINCT ON (story_id)
        story_id,
        id,
        title,
        description,
        url,
        image_url,
        source_name
    FROM story_article
    ORDER BY
        story_id,
        duplicates_count DESC,
        published_at ASC,
        id ASC
),

membership AS (
    SELECT
        story_id,
        count(*)::int AS article_count,
        array_agg(id ORDER BY id) AS article_ids,
        min(published_at) AS first_published_at,
        max(published_at) AS last_published_at,

        -- True when an editor placed any of its articles.
        bool_or(assigned_by = 'editor') AS edited
    FROM story_article
    GROUP BY story_id
),

-- Every outlet carrying the story, syndicated copies included.
outlet AS (
    SELECT
        story_id,
        count(DISTINCT outlet_name)::int AS source_count,
        array_agg(DISTINCT outlet_name ORDER BY outlet_name) AS source_names
    FROM story_article
    CROSS JOIN LATERAL unnest(duplicate_source_names) AS o(outlet_name)
    WHERE outlet_name IS NOT NULL
    GROUP BY story_id
)

SELECT
    s.id,
    s.category,
    s.published_date,

    l.id AS lead_article_id,
    l.title AS lead_title,
    l.description AS lead_description,
    l.url AS lead_url,
    l.image_url AS lead_image_url,
    l.source_name AS lead_source_name,

    m.article_count,
    m.article_ids,
    COALESCE(o.source_count, 0) AS source_count,
    COALESCE(o.source_names, '{}') AS source_names,

    m.first_published_at,
    m.last_published_at,
    m.edited,

    s.clustering_method,
    s.clustering_version,
    s.clustering_metadata,
    s.created_at,
    s.updated_at

FROM news.gnews_story s

JOIN membership m
    ON m.story_id = s.id

JOIN lead l
    ON l.story_id = s.id

LEFT JOIN outlet o
    ON o.story_id = s.id;


-- pipeline step
-- an llm rates each story's fit with its category and its importance

CREATE TABLE news.gnews_story_relevance (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    story_id bigint NOT NULL
        REFERENCES news.gnews_story(id)
        ON DELETE CASCADE,

    model text NOT NULL,
    criteria_version text NOT NULL,

    -- The articles rated, in id order, and a hash of the prompt.
    article_ids bigint[] NOT NULL,
    input_hash text NOT NULL,

    -- 1 (barely) to 5 (squarely) within the story's category.
    category_relevance smallint NOT NULL
        CHECK (category_relevance BETWEEN 1 AND 5),

    -- 1 (trivial) to 5 (major) for a general audience.
    importance smallint NOT NULL
        CHECK (importance BETWEEN 1 AND 5),

    rationale text NOT NULL,

    -- Articles the model judged to report a different event from the
    -- rest of the story: likely clustering mistakes, for editors.
    different_event_article_ids bigint[] NOT NULL,

    -- The model's complete response and its token usage.
    response jsonb NOT NULL,
    input_tokens integer NOT NULL,
    output_tokens integer NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_gnews_story_relevance
        UNIQUE (story_id, model, criteria_version, input_hash)
);


-- editorial input
-- editors' relevance ratings, which take precedence over the model's

CREATE TABLE news.gnews_story_relevance_override (
    story_id bigint PRIMARY KEY
        REFERENCES news.gnews_story(id)
        ON DELETE CASCADE,

    category_relevance smallint NOT NULL
        CHECK (category_relevance BETWEEN 1 AND 5),

    importance smallint NOT NULL
        CHECK (importance BETWEEN 1 AND 5),

    note text,

    created_at timestamptz NOT NULL DEFAULT now()
);


-- pipeline step
-- stories ranked within each category and day, by editors' ratings
-- where there are any and the model's latest otherwise

CREATE OR REPLACE VIEW news.v_gnews_story_ranked AS
WITH latest_rating AS (
    SELECT DISTINCT ON (story_id) *
    FROM news.gnews_story_relevance
    ORDER BY story_id, created_at DESC, id DESC
),

rated AS (
    SELECT
        s.*,

        r.model AS relevance_model,
        r.criteria_version AS relevance_criteria_version,
        r.category_relevance AS model_category_relevance,
        r.importance AS model_importance,
        r.rationale AS relevance_rationale,
        r.different_event_article_ids,
        r.created_at AS rated_at,

        -- False once the story's articles change after rating.
        r.article_ids = s.article_ids AS rating_is_current,

        o.category_relevance AS editor_category_relevance,
        o.importance AS editor_importance,
        o.note AS editor_note,

        COALESCE(o.category_relevance, r.category_relevance)
            AS category_relevance,
        COALESCE(o.importance, r.importance) AS importance

    FROM news.v_gnews_story s

    LEFT JOIN latest_rating r
        ON r.story_id = s.id

    LEFT JOIN news.gnews_story_relevance_override o
        ON o.story_id = s.id
)

SELECT
    rated.*,

    -- Category fit and importance stay separate: fit decides whether
    -- a story belongs in the category's feed, importance its place.
    category_relevance >= 3 AS fits_category,

    -- Stories that fit come first, then by importance. Unrated
    -- stories come last.
    ROW_NUMBER() OVER (
        PARTITION BY category, published_date
        ORDER BY
            (category_relevance >= 3) DESC NULLS LAST,
            importance DESC NULLS LAST,
            category_relevance DESC NULLS LAST,
            source_count DESC,
            article_count DESC,
            first_published_at ASC,
            id ASC
    )::int AS relevance_rank

FROM rated;


-- pipeline step
-- an llm extracts claims from each relevant story and compares how
-- its sources report them

CREATE TABLE news.gnews_story_analysis (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    story_id bigint NOT NULL
        REFERENCES news.gnews_story(id)
        ON DELETE CASCADE,

    model text NOT NULL,
    prompt_version text NOT NULL,

    -- The articles analyzed, in id order, and a hash of the prompt.
    article_ids bigint[] NOT NULL,
    input_hash text NOT NULL,

    -- The model's response, unchanged, and the analysis checked
    -- against the story's articles. Plus the response's token usage.
    response jsonb NOT NULL,
    analysis jsonb NOT NULL,
    input_tokens integer NOT NULL,
    output_tokens integer NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_gnews_story_analysis
        UNIQUE (story_id, model, prompt_version, input_hash)
);


-- editorial input
-- editors' verdicts on analyses

CREATE TABLE news.gnews_story_analysis_review (
    analysis_id bigint PRIMARY KEY
        REFERENCES news.gnews_story_analysis(id)
        ON DELETE CASCADE,

    verdict text NOT NULL
        CHECK (verdict IN ('approved', 'rejected')),

    note text,

    reviewed_at timestamptz NOT NULL DEFAULT now()
);


-- pipeline step
-- each story's latest analysis, with its editorial review

CREATE OR REPLACE VIEW news.v_gnews_story_analysis AS
SELECT
    a.id,
    a.story_id,

    a.analysis ->> 'headline' AS headline,
    a.analysis ->> 'summary' AS summary,
    ARRAY(
        SELECT jsonb_array_elements_text(a.analysis -> 'takeaways')
    ) AS takeaways,
    a.analysis -> 'claims' AS claims,
    a.analysis -> 'syndicated_copies' AS syndicated_copies,
    a.analysis -> 'framing' AS framing,

    a.article_ids,

    -- False once the story's articles change after analysis.
    a.article_ids = s.article_ids AS analysis_is_current,

    r.verdict AS review_verdict,
    r.note AS review_note,
    r.reviewed_at,

    a.model,
    a.prompt_version,
    a.input_tokens,
    a.output_tokens,
    a.created_at

FROM (
    SELECT DISTINCT ON (story_id) *
    FROM news.gnews_story_analysis
    ORDER BY story_id, created_at DESC, id DESC
) a

JOIN news.v_gnews_story s
    ON s.id = a.story_id

LEFT JOIN news.gnews_story_analysis_review r
    ON r.analysis_id = a.id;


-- pipeline step
-- one row per claim, with the independent reports that support or
-- contradict it

CREATE OR REPLACE VIEW news.v_gnews_story_claim AS
WITH claim AS (
    SELECT
        a.id AS analysis_id,
        a.story_id,
        a.article_ids AS story_article_ids,
        a.syndicated_copies,
        a.review_verdict,
        c.ordinality::int AS claim_number,
        c.value AS claim
    FROM news.v_gnews_story_analysis a
    CROSS JOIN LATERAL jsonb_array_elements(a.claims)
        WITH ORDINALITY AS c(value, ordinality)
),

source AS (
    SELECT
        claim.analysis_id,
        claim.claim_number,
        s.article_id,
        s.stance,

        -- Syndicated copies of one report count once, as the copy
        -- with the lowest article ID.
        COALESCE(
            (
                SELECT min(copy_id::bigint)
                FROM jsonb_array_elements(claim.syndicated_copies) AS g(copies)
                CROSS JOIN LATERAL
                    jsonb_array_elements_text(g.copies -> 'article_ids') AS copy_id
                WHERE g.copies -> 'article_ids' @> to_jsonb(s.article_id)
            ),
            s.article_id
        ) AS report_id

    FROM claim
    CROSS JOIN LATERAL (
        SELECT
            (value ->> 'article_id')::bigint AS article_id,
            value ->> 'stance' AS stance
        FROM jsonb_array_elements(claim.claim -> 'sources')
    ) s
),

tally AS (
    SELECT
        analysis_id,
        claim_number,

        array_agg(article_id ORDER BY article_id)
            FILTER (WHERE stance = 'supports') AS supporting_article_ids,
        array_agg(article_id ORDER BY article_id)
            FILTER (WHERE stance = 'contradicts') AS contradicting_article_ids,

        count(DISTINCT report_id)
            FILTER (WHERE stance = 'supports')::int AS supporting_reports,
        count(DISTINCT report_id)
            FILTER (WHERE stance = 'contradicts')::int AS contradicting_reports
    FROM source
    GROUP BY analysis_id, claim_number
)

SELECT
    claim.analysis_id,
    claim.story_id,
    claim.claim_number,

    claim.claim ->> 'statement' AS statement,
    claim.claim ->> 'kind' AS kind,

    CASE
        WHEN COALESCE(t.contradicting_reports, 0) > 0 THEN 'disputed'
        WHEN t.supporting_reports >= 2 THEN 'corroborated'
        WHEN t.supporting_reports = 1 THEN 'single source'
        ELSE 'unsupported'
    END AS agreement,

    COALESCE(t.supporting_reports, 0) AS supporting_reports,
    COALESCE(t.contradicting_reports, 0) AS contradicting_reports,
    COALESCE(t.supporting_article_ids, '{}') AS supporting_article_ids,
    COALESCE(t.contradicting_article_ids, '{}') AS contradicting_article_ids,

    -- The story's other articles don't mention the claim. Not
    -- mentioning a claim is not contradicting it.
    ARRAY(
        SELECT unnest(claim.story_article_ids)
        EXCEPT
        SELECT (value ->> 'article_id')::bigint
        FROM jsonb_array_elements(claim.claim -> 'sources')
        ORDER BY 1
    ) AS not_mentioned_article_ids,

    -- Each source's stance and its quoted evidence.
    claim.claim -> 'sources' AS sources,

    claim.review_verdict

FROM claim

LEFT JOIN tally t
    ON t.analysis_id = claim.analysis_id
   AND t.claim_number = claim.claim_number;