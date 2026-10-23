
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from datetime import date
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

from news.repository.gnews_story_reader import read_stories
from news.stories.story import Story


@dataclass(frozen=True)
class StoryAnalysis:
    story_id: int
    model: str
    prompt_version: str
    article_ids: list[int]
    input_hash: str
    response: dict[str, Any]
    analysis: dict[str, Any]
    input_tokens: int
    output_tokens: int


class GNewsStoryAnalysisRepository:
    # The day's highest-ranked stories that fit their category.
    RELEVANT_STORIES_SQL = """
        SELECT id, category, published_date, article_ids
        FROM news.v_gnews_story_ranked
        WHERE category = %(category)s
          AND published_date = %(published_date)s
          AND fits_category
          AND importance >= %(min_importance)s
        ORDER BY relevance_rank
        LIMIT %(limit)s;
    """

    INPUT_HASHES_SQL = """
        SELECT story_id, array_agg(input_hash)
        FROM news.gnews_story_analysis
        WHERE story_id = ANY(%(story_ids)s)
          AND model = %(model)s
          AND prompt_version = %(prompt_version)s
        GROUP BY story_id;
    """

    INSERT_SQL = """
        INSERT INTO news.gnews_story_analysis (
            story_id,
            model,
            prompt_version,
            article_ids,
            input_hash,
            response,
            analysis,
            input_tokens,
            output_tokens
        )
        VALUES (
            %(story_id)s,
            %(model)s,
            %(prompt_version)s,
            %(article_ids)s,
            %(input_hash)s,
            %(response)s,
            %(analysis)s,
            %(input_tokens)s,
            %(output_tokens)s
        )
        ON CONFLICT (story_id, model, prompt_version, input_hash)
        DO NOTHING;
    """

    def __init__(self, connection_string: str) -> None:
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")

        self._connection_string = connection_string

    def get_relevant_stories(
        self,
        category: str,
        published_date: date,
        min_importance: int,
        limit: int,
    ) -> list[Story]:
        """In rank order."""
        params = {
            "category": category,
            "published_date": published_date,
            "min_importance": min_importance,
            "limit": limit,
        }

        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(self.RELEVANT_STORIES_SQL, params).fetchall()
            return read_stories(conn, rows)

    def get_input_hashes(
        self,
        story_ids: Sequence[int],
        model: str,
        prompt_version: str,
    ) -> dict[int, frozenset[str]]:
        """Story ID -> input hashes it already has analyses for."""
        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(self.INPUT_HASHES_SQL, {
                "story_ids": list(story_ids),
                "model": model,
                "prompt_version": prompt_version,
            }).fetchall()

        return {story_id: frozenset(hashes) for story_id, hashes in rows}

    def save_analysis(self, analysis: StoryAnalysis) -> None:
        with psycopg.connect(self._connection_string) as conn:
            conn.execute(self.INSERT_SQL, {
                **asdict(analysis),
                "response": Jsonb(analysis.response),
                "analysis": Jsonb(analysis.analysis),
            })
