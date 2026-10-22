CREATE SCHEMA IF NOT EXISTS news;

-- assumes that pos
CREATE EXTENSION IF NOT EXISTS vector;
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



DROP VIEW IF EXISTS news.v_gnews_article_deduped;

CREATE VIEW news.v_gnews_article_deduped AS

WITH normalized AS (
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

    FROM news.v_gnews_article a
),

ranked AS (
    SELECT
        n.*,

        COUNT(*) OVER w_group AS duplicates_count,

        -- Outlets carrying the article, earliest publication first.
        array_agg(source_name) OVER w_ordered AS duplicate_source_names,

        ROW_NUMBER() OVER w_ordered AS rn

    FROM normalized n

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
        )
)

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

FROM ranked
WHERE rn = 1;




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

