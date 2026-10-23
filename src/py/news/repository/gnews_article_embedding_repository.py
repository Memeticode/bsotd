
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

import psycopg


@dataclass(frozen=True)
class EmbeddingCandidate:
    gnews_article_id: int
    title: str | None
    description: str | None
    content: str | None
    # The input hash of its latest embedding with the model, if any.
    latest_input_hash: str | None


@dataclass(frozen=True)
class ArticleEmbedding:
    gnews_article_id: int
    model: str
    input_hash: str
    embedding: list[float]


class GNewsArticleEmbeddingRepository:
    # Embeds the daily processing set only: one vector per
    # syndicated group, stored against its canonical row, and one
    # per article however many collections it appears in.
    CANDIDATES_SQL = """
        SELECT
            d.id,
            d.title,
            d.description,
            d.content,
            latest.input_hash
        FROM news.v_gnews_article_daily d
        LEFT JOIN LATERAL (
            SELECT e.input_hash
            FROM news.gnews_article_embedding e
            WHERE e.gnews_article_id = d.id
              AND e.model = %(model)s
            ORDER BY e.created_at DESC, e.id DESC
            LIMIT 1
        ) latest ON true
        WHERE d.category = %(category)s
          AND d.published_date = %(published_date)s
        ORDER BY d.id;
    """

    INSERT_SQL = """
        INSERT INTO news.gnews_article_embedding (
            gnews_article_id,
            model,
            input_hash,
            embedding
        )
        VALUES (
            %(gnews_article_id)s,
            %(model)s,
            %(input_hash)s,
            %(embedding)s::real[]::vector
        )
        -- Text that returns to an earlier version reuses that version's
        -- embedding, which becomes the latest again.
        ON CONFLICT (gnews_article_id, model, input_hash)
        DO UPDATE SET created_at = now();
    """

    def __init__(self, connection_string: str) -> None:
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")

        self._connection_string = connection_string

    def get_candidates(
        self,
        category: str,
        published_date: date,
        model: str,
    ) -> list[EmbeddingCandidate]:
        params = {
            "category": category,
            "published_date": published_date,
            "model": model,
        }

        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(self.CANDIDATES_SQL, params).fetchall()

        return [
            EmbeddingCandidate(
                gnews_article_id=row[0],
                title=row[1],
                description=row[2],
                content=row[3],
                latest_input_hash=row[4],
            )
            for row in rows
        ]

    def save_embeddings(
        self,
        embeddings: Sequence[ArticleEmbedding],
    ) -> int:
        if not embeddings:
            return 0

        rows = [
            {
                "gnews_article_id": e.gnews_article_id,
                "model": e.model,
                "input_hash": e.input_hash,
                "embedding": e.embedding,
            }
            for e in embeddings
        ]

        # Transaction scope: one batch.
        with psycopg.connect(self._connection_string) as conn:
            with conn.cursor() as cursor:
                cursor.executemany(self.INSERT_SQL, rows)

        return len(rows)
