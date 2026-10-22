
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from typing import Any

import psycopg
from psycopg.types.json import Jsonb


@dataclass(frozen=True)
class GNewsCollection:
    category: str
    date: date
    language: str = "en"
    country: str = "us"


class GNewsArticleRepository:
    UPSERT_SQL = """
        INSERT INTO news.gnews_article (
            gnews_id,
            data,
            category,
            collection_date,
            language,
            country
        )
        VALUES (
            %(gnews_id)s,
            %(data)s,
            %(category)s,
            %(collection_date)s,
            %(language)s,
            %(country)s
        )
        ON CONFLICT (
            gnews_id,
            category,
            collection_date,
            language,
            country
        )
        DO UPDATE SET
            data = EXCLUDED.data,
            last_ingested_at = NOW();
    """

    def __init__(self, connection_string: str) -> None:
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")

        self._connection_string = connection_string

    def save_articles(
        self,
        articles: Sequence[dict[str, Any]],
        collection: GNewsCollection,
    ) -> int:
        if not articles:
            return 0

        rows = []

        for article in articles:
            article_id = article.get("id")

            if not isinstance(article_id, str) or not article_id:
                raise ValueError("GNews article is missing its ID")

            rows.append({
                "gnews_id": article_id,
                "data": Jsonb(article),
                "category": collection.category,
                "collection_date": collection.date,
                "language": collection.language,
                "country": collection.country,
            })

        # Transaction scope: one API page.
        # All articles on the page succeed or all roll back.
        with psycopg.connect(self._connection_string) as conn:
            with conn.cursor() as cursor:
                cursor.executemany(self.UPSERT_SQL, rows)

        return len(rows)
