
from collections.abc import Sequence
from datetime import date

import psycopg

from news.stories.story import Story, StoryArticle


ARTICLES_SQL = """
    SELECT
        id,
        source_name,
        duplicate_source_names,
        published_at,
        title,
        description,
        content
    FROM news.v_gnews_article_daily
    WHERE id = ANY(%(article_ids)s);
"""

# (story ID, category, published date, article IDs)
StoryRow = tuple[int, str, date, Sequence[int]]


def read_stories(
    conn: psycopg.Connection,
    rows: Sequence[StoryRow],
) -> list[Story]:
    """Stories from rows of a story view, in the order given, with their
    articles read from the daily processing set."""
    article_ids = sorted({
        article_id for *_, story_article_ids in rows
        for article_id in story_article_ids
    })

    articles = {
        article_id: StoryArticle(
            article_id,
            source_name,
            tuple(outlet for outlet in carried_by or () if outlet),
            published_at,
            *text,
        )
        for article_id, source_name, carried_by, published_at, *text
        in conn.execute(ARTICLES_SQL, {"article_ids": article_ids})
    }

    return [
        Story(
            id=story_id,
            category=category,
            published_date=published_date,
            articles=tuple(
                articles[article_id]
                for article_id in sorted(story_article_ids)
                if article_id in articles
            ),
        )
        for story_id, category, published_date, story_article_ids in rows
    ]
