
from dataclasses import dataclass
from datetime import date

import psycopg


@dataclass(frozen=True)
class VectorStatus:
    # Article ID -> (title, description), for every article with a
    # vector of either kind.
    articles: dict[int, tuple[str | None, str | None]]
    # Article ID -> input hashes it has embeddings for, with the model.
    embedding_hashes: dict[int, frozenset[str]]
    # The day's TF-IDF corpus, if fitted, and article ID -> the input
    # hash of its vector in that corpus.
    corpus_id: int | None
    tfidf_hashes: dict[int, str]


@dataclass(frozen=True)
class ScoredPairs:
    pair_count: int
    corpus_ids: frozenset[int]
    embedding_models: frozenset[str]


class GNewsArticleSimilarityRepository:
    """Reads the sentence embedding and TF-IDF jobs' outputs, and writes
    the day's pairs."""

    EMBEDDINGS_SQL = """
        SELECT id, title, description, array_agg(embedding_input_hash)
        FROM news.v_gnews_article_title_and_description_embedded
        WHERE category = %(category)s
          AND published_date = %(published_date)s
          AND embedding_model = %(model)s
        GROUP BY id, title, description;
    """

    TFIDF_SQL = """
        SELECT id, title, description, tfidf_corpus_id, tfidf_input_hash
        FROM news.v_gnews_article_title_and_description_tfidf
        WHERE category = %(category)s
          AND published_date = %(published_date)s;
    """

    SCORED_SQL = """
        SELECT
            count(*),
            COALESCE(array_agg(DISTINCT tfidf_corpus_id), '{}'),
            COALESCE(array_agg(DISTINCT embedding_model), '{}')
        FROM news.gnews_article_daily_similarity
        WHERE category = %(category)s
          AND published_date = %(published_date)s;
    """

    DELETE_SQL = """
        DELETE FROM news.gnews_article_daily_similarity
        WHERE category = %(category)s
          AND published_date = %(published_date)s;
    """

    # Scores each unordered pair once with pgvector, using only the
    # vectors computed from each article's current text. Cosine
    # distance with an empty TF-IDF vector is NaN, stored as NULL.
    INSERT_SQL = """
        WITH current_article AS (
            SELECT *
            FROM unnest(
                %(article_ids)s::bigint[],
                %(input_hashes)s::text[]
            ) AS c(id, input_hash)
        ),

        article AS (
            SELECT
                c.id,
                e.embedding,
                t.tfidf
            FROM current_article c
            JOIN news.v_gnews_article_title_and_description_embedded e
                ON e.id = c.id
               AND e.embedding_model = %(model)s
               AND e.embedding_input_hash = c.input_hash
            JOIN news.v_gnews_article_title_and_description_tfidf t
                ON t.id = c.id
               AND t.tfidf_corpus_id = %(corpus_id)s
               AND t.tfidf_input_hash = c.input_hash
        )

        INSERT INTO news.gnews_article_daily_similarity (
            category,
            published_date,
            article_a_id,
            article_b_id,
            embedding_model,
            tfidf_corpus_id,
            embedding_cosine_similarity,
            tfidf_cosine_similarity
        )
        SELECT
            %(category)s,
            %(published_date)s,
            a.id,
            b.id,
            %(model)s,
            %(corpus_id)s,
            1 - (a.embedding <=> b.embedding),
            NULLIF(1 - (a.tfidf <=> b.tfidf), 'NaN')
        FROM article a
        JOIN article b
            ON a.id < b.id;
    """

    def __init__(self, connection_string: str) -> None:
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")

        self._connection_string = connection_string

    def get_vector_status(
        self,
        category: str,
        published_date: date,
        model: str,
    ) -> VectorStatus:
        day = {"category": category, "published_date": published_date}

        with psycopg.connect(self._connection_string) as conn:
            embeddings = conn.execute(
                self.EMBEDDINGS_SQL, {**day, "model": model}
            ).fetchall()
            tfidf = conn.execute(self.TFIDF_SQL, day).fetchall()

        articles = {
            article_id: (title, description)
            for article_id, title, description, *_ in [*embeddings, *tfidf]
        }

        return VectorStatus(
            articles=articles,
            embedding_hashes={
                article_id: frozenset(hashes)
                for article_id, _, _, hashes in embeddings
            },
            corpus_id=tfidf[0][3] if tfidf else None,
            tfidf_hashes={
                article_id: input_hash
                for article_id, _, _, _, input_hash in tfidf
            },
        )

    def get_scored_pairs(
        self,
        category: str,
        published_date: date,
    ) -> ScoredPairs:
        day = {"category": category, "published_date": published_date}

        with psycopg.connect(self._connection_string) as conn:
            count, corpus_ids, models = conn.execute(
                self.SCORED_SQL, day
            ).fetchone()

        return ScoredPairs(
            pair_count=count,
            corpus_ids=frozenset(corpus_ids),
            embedding_models=frozenset(models),
        )

    def replace_pairs(
        self,
        category: str,
        published_date: date,
        model: str,
        corpus_id: int | None,
        input_hashes: dict[int, str],
    ) -> int:
        """Replaces the day's pairs with those of the given articles,
        keyed by their current input hashes. Returns how many were saved;
        with no articles, the day's pairs are only removed."""
        day = {"category": category, "published_date": published_date}

        # Transaction scope: the whole day.
        with psycopg.connect(self._connection_string) as conn:
            conn.execute(self.DELETE_SQL, day)

            cursor = conn.execute(self.INSERT_SQL, {
                **day,
                "model": model,
                "corpus_id": corpus_id,
                "article_ids": list(input_hashes),
                "input_hashes": list(input_hashes.values()),
            })

            return cursor.rowcount
