
from dataclasses import dataclass
from datetime import date

import psycopg


@dataclass(frozen=True)
class DailyArticle:
    id: int
    title: str | None
    description: str | None
    content: str | None


class GNewsDailyArticleRepository:
    """Reads the daily processing set: one row per article per category
    and UTC publication date."""

    ARTICLES_SQL = """
        SELECT id, title, description, content
        FROM news.v_gnews_article_daily
        WHERE category = %(category)s
          AND published_date = %(published_date)s
        ORDER BY id;
    """

    def __init__(self, connection_string: str) -> None:
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")

        self._connection_string = connection_string

    def get_articles(
        self,
        category: str,
        published_date: date,
    ) -> list[DailyArticle]:
        params = {"category": category, "published_date": published_date}

        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(self.ARTICLES_SQL, params).fetchall()

        return [DailyArticle(*row) for row in rows]
