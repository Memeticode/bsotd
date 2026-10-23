
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from typing import Any

import psycopg
from psycopg.types.json import Jsonb


@dataclass(frozen=True)
class StoredCorpus:
    id: int
    configuration: dict[str, Any]
    # Article ID -> the input hash its vector was computed from.
    input_hashes: dict[int, str]


@dataclass(frozen=True)
class TfidfDocument:
    gnews_article_id: int
    input_hash: str
    # A pgvector sparsevec literal.
    tfidf: str


class GNewsArticleTfidfRepository:
    CORPUS_SQL = """
        SELECT
            c.id,
            c.configuration,
            COALESCE(
                jsonb_object_agg(t.gnews_article_id, t.input_hash)
                    FILTER (WHERE t.id IS NOT NULL),
                '{}'
            ) AS input_hashes
        FROM news.gnews_article_tfidf_corpus c
        LEFT JOIN news.gnews_article_tfidf t
            ON t.corpus_id = c.id
        WHERE c.category = %(category)s
          AND c.published_date = %(published_date)s
        GROUP BY c.id, c.configuration;
    """

    # Cascades to the corpus's vectors and the similarities computed
    # from them.
    DELETE_CORPUS_SQL = """
        DELETE FROM news.gnews_article_tfidf_corpus
        WHERE category = %(category)s
          AND published_date = %(published_date)s;
    """

    INSERT_CORPUS_SQL = """
        INSERT INTO news.gnews_article_tfidf_corpus (
            category,
            published_date,
            configuration,
            vocabulary,
            idf_weights,
            document_count
        )
        VALUES (
            %(category)s,
            %(published_date)s,
            %(configuration)s,
            %(vocabulary)s,
            %(idf_weights)s,
            %(document_count)s
        )
        RETURNING id;
    """

    INSERT_VECTOR_SQL = """
        INSERT INTO news.gnews_article_tfidf (
            corpus_id,
            gnews_article_id,
            input_hash,
            tfidf
        )
        VALUES (
            %(corpus_id)s,
            %(gnews_article_id)s,
            %(input_hash)s,
            %(tfidf)s::sparsevec
        );
    """

    def __init__(self, connection_string: str) -> None:
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")

        self._connection_string = connection_string

    def get_corpus(
        self,
        category: str,
        published_date: date,
    ) -> StoredCorpus | None:
        params = {"category": category, "published_date": published_date}

        with psycopg.connect(self._connection_string) as conn:
            row = conn.execute(self.CORPUS_SQL, params).fetchone()

        if row is None:
            return None

        corpus_id, configuration, input_hashes = row

        return StoredCorpus(
            id=corpus_id,
            configuration=configuration,
            input_hashes={
                int(article_id): input_hash
                for article_id, input_hash in input_hashes.items()
            },
        )

    def replace_corpus(
        self,
        category: str,
        published_date: date,
        configuration: dict[str, Any],
        vocabulary: dict[str, int],
        idf_weights: list[float],
        documents: Sequence[TfidfDocument],
    ) -> int:
        """Replaces the day's corpus and vectors. Returns the new corpus's ID."""
        day = {"category": category, "published_date": published_date}

        # Transaction scope: the whole corpus.
        with psycopg.connect(self._connection_string) as conn:
            conn.execute(self.DELETE_CORPUS_SQL, day)

            corpus_id = conn.execute(self.INSERT_CORPUS_SQL, {
                **day,
                "configuration": Jsonb(configuration),
                "vocabulary": Jsonb(vocabulary),
                "idf_weights": idf_weights,
                "document_count": len(documents),
            }).fetchone()[0]

            with conn.cursor() as cursor:
                cursor.executemany(self.INSERT_VECTOR_SQL, [
                    {
                        "corpus_id": corpus_id,
                        "gnews_article_id": document.gnews_article_id,
                        "input_hash": document.input_hash,
                        "tfidf": document.tfidf,
                    }
                    for document in documents
                ])

        return corpus_id
