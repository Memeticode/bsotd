
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from datetime import date
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

from news.repository.gnews_story_reader import read_stories
from news.stories.story import Story


@dataclass(frozen=True)
class StoryRating:
    story_id: int
    model: str
    criteria_version: str
    article_ids: list[int]
    input_hash: str
    category_relevance: int
    importance: int
    rationale: str
    different_event_article_ids: list[int]
    response: dict[str, Any]
    input_tokens: int
    output_tokens: int


class GNewsStoryRelevanceRepository:
    STORIES_SQL = """
        SELECT id, category, published_date, article_ids
        FROM news.v_gnews_story
        WHERE category = %(category)s
          AND published_date = %(published_date)s
        ORDER BY id;
    """

    INPUT_HASHES_SQL = """
        SELECT story_id, array_agg(input_hash)
        FROM news.gnews_story_relevance
        WHERE story_id = ANY(%(story_ids)s)
          AND model = %(model)s
          AND criteria_version = %(criteria_version)s
        GROUP BY story_id;
    """

    INSERT_SQL = """
        INSERT INTO news.gnews_story_relevance (
            story_id,
            model,
            criteria_version,
            article_ids,
            input_hash,
            category_relevance,
            importance,
            rationale,
            different_event_article_ids,
            response,
            input_tokens,
            output_tokens
        )
        VALUES (
            %(story_id)s,
            %(model)s,
            %(criteria_version)s,
            %(article_ids)s,
            %(input_hash)s,
            %(category_relevance)s,
            %(importance)s,
            %(rationale)s,
            %(different_event_article_ids)s,
            %(response)s,
            %(input_tokens)s,
            %(output_tokens)s
        )
        ON CONFLICT (story_id, model, criteria_version, input_hash)
        DO NOTHING;
    """

    def __init__(self, connection_string: str) -> None:
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")

        self._connection_string = connection_string

    def get_stories(self, category: str, published_date: date) -> list[Story]:
        day = {"category": category, "published_date": published_date}

        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(self.STORIES_SQL, day).fetchall()
            return read_stories(conn, rows)

    def get_input_hashes(
        self,
        story_ids: Sequence[int],
        model: str,
        criteria_version: str,
    ) -> dict[int, frozenset[str]]:
        """Story ID -> input hashes it already has ratings for."""
        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(self.INPUT_HASHES_SQL, {
                "story_ids": list(story_ids),
                "model": model,
                "criteria_version": criteria_version,
            }).fetchall()

        return {story_id: frozenset(hashes) for story_id, hashes in rows}

    def save_rating(self, rating: StoryRating) -> None:
        with psycopg.connect(self._connection_string) as conn:
            conn.execute(self.INSERT_SQL, {
                **asdict(rating),
                "response": Jsonb(rating.response),
            })
