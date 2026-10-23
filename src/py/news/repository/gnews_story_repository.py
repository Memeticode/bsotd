
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

from news.stories.story_clustering import ArticlePair, AssignmentOverride


@dataclass(frozen=True)
class StoredStory:
    id: int
    article_ids: frozenset[int]
    # Articles an editor's correction placed in the story.
    editor_placed: frozenset[int]
    clustering_metadata: dict[str, Any]


@dataclass(frozen=True)
class PlannedStory:
    # The existing story this continues, or None for a new story.
    story_id: int | None
    article_ids: frozenset[int]
    editor_placed: frozenset[int]
    clustering_metadata: dict[str, Any]
    # Whether its articles or metadata differ from what's stored.
    changed: bool


@dataclass(frozen=True)
class SavedStories:
    created: int
    updated: int
    unchanged: int
    removed: int


class GNewsStoryRepository:
    PAIRS_SQL = """
        SELECT
            article_a_id,
            article_b_id,
            embedding_cosine_similarity,
            tfidf_cosine_similarity
        FROM news.v_gnews_article_daily_similarity
        WHERE category = %(category)s
          AND published_date = %(published_date)s;
    """

    # In the order editors made them, so they replay faithfully.
    OVERRIDES_SQL = """
        SELECT gnews_article_id, together_with_article_id
        FROM news.gnews_story_article_override
        WHERE gnews_article_id = ANY(%(article_ids)s)
        ORDER BY created_at, gnews_article_id;
    """

    STORIES_SQL = """
        SELECT
            s.id,
            COALESCE(
                array_agg(sa.gnews_article_id)
                    FILTER (WHERE sa.gnews_article_id IS NOT NULL),
                '{}'
            ),
            COALESCE(
                array_agg(sa.gnews_article_id)
                    FILTER (WHERE sa.assigned_by = 'editor'),
                '{}'
            ),
            s.clustering_metadata
        FROM news.gnews_story s
        LEFT JOIN news.gnews_story_article sa
            ON sa.story_id = s.id
        WHERE s.category = %(category)s
          AND s.published_date = %(published_date)s
        GROUP BY s.id;
    """

    LOCK_STORIES_SQL = """
        SELECT id
        FROM news.gnews_story
        WHERE category = %(category)s
          AND published_date = %(published_date)s
        FOR UPDATE;
    """

    DELETE_MEMBERSHIPS_SQL = """
        DELETE FROM news.gnews_story_article
        WHERE story_id = ANY(%(story_ids)s);
    """

    # Cascades to the stories' ratings, analyses and relevance overrides.
    DELETE_STORIES_SQL = """
        DELETE FROM news.gnews_story
        WHERE id = ANY(%(story_ids)s);
    """

    INSERT_STORY_SQL = """
        INSERT INTO news.gnews_story (
            category,
            published_date,
            clustering_method,
            clustering_version,
            clustering_metadata
        )
        VALUES (
            %(category)s,
            %(published_date)s,
            %(method)s,
            %(version)s,
            %(metadata)s
        )
        RETURNING id;
    """

    UPDATE_STORY_SQL = """
        UPDATE news.gnews_story
        SET clustering_method = %(method)s,
            clustering_version = %(version)s,
            clustering_metadata = %(metadata)s,
            updated_at = now()
        WHERE id = %(story_id)s;
    """

    INSERT_MEMBERSHIP_SQL = """
        INSERT INTO news.gnews_story_article (
            story_id,
            gnews_article_id,
            assigned_by
        )
        VALUES (
            %(story_id)s,
            %(gnews_article_id)s,
            %(assigned_by)s
        );
    """

    def __init__(self, connection_string: str) -> None:
        if not connection_string:
            raise ValueError("PostgreSQL connection string is required")

        self._connection_string = connection_string

    def get_pairs(
        self,
        category: str,
        published_date: date,
    ) -> list[ArticlePair]:
        day = {"category": category, "published_date": published_date}

        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(self.PAIRS_SQL, day).fetchall()

        return [ArticlePair(*row) for row in rows]

    def get_overrides(
        self,
        article_ids: Sequence[int],
    ) -> list[AssignmentOverride]:
        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(
                self.OVERRIDES_SQL, {"article_ids": list(article_ids)}
            ).fetchall()

        return [AssignmentOverride(*row) for row in rows]

    def get_stories(
        self,
        category: str,
        published_date: date,
    ) -> list[StoredStory]:
        day = {"category": category, "published_date": published_date}

        with psycopg.connect(self._connection_string) as conn:
            rows = conn.execute(self.STORIES_SQL, day).fetchall()

        return [
            StoredStory(
                id=story_id,
                article_ids=frozenset(article_ids),
                editor_placed=frozenset(editor_placed),
                clustering_metadata=metadata,
            )
            for story_id, article_ids, editor_placed, metadata in rows
        ]

    def save_stories(
        self,
        category: str,
        published_date: date,
        method: str,
        version: str,
        stories: Sequence[PlannedStory],
    ) -> SavedStories:
        """Makes the day's stories exactly `stories`: continued stories
        keep their IDs, new ones are created and the rest removed."""
        day = {"category": category, "published_date": published_date}
        clustering = {"method": method, "version": version}

        created = updated = unchanged = 0

        # Transaction scope: the whole day.
        with psycopg.connect(self._connection_string) as conn:
            existing = {
                row[0]
                for row in conn.execute(self.LOCK_STORIES_SQL, day)
            }
            kept = {s.story_id for s in stories if s.story_id is not None}

            if not kept <= existing:
                raise ValueError("Stories can only continue the day's own stories")

            # Memberships are rewritten in full, which lets articles move
            # between stories without breaking one-story-per-article.
            conn.execute(
                self.DELETE_MEMBERSHIPS_SQL, {"story_ids": list(existing)}
            )
            conn.execute(
                self.DELETE_STORIES_SQL, {"story_ids": list(existing - kept)}
            )

            memberships = []

            for story in stories:
                metadata = Jsonb(story.clustering_metadata)

                if story.story_id is None:
                    story_id = conn.execute(self.INSERT_STORY_SQL, {
                        **day, **clustering, "metadata": metadata,
                    }).fetchone()[0]
                    created += 1
                elif story.changed:
                    story_id = story.story_id
                    conn.execute(self.UPDATE_STORY_SQL, {
                        **clustering, "metadata": metadata, "story_id": story_id,
                    })
                    updated += 1
                else:
                    story_id = story.story_id
                    unchanged += 1

                memberships.extend(
                    {
                        "story_id": story_id,
                        "gnews_article_id": article_id,
                        "assigned_by": (
                            "editor"
                            if article_id in story.editor_placed
                            else "model"
                        ),
                    }
                    for article_id in sorted(story.article_ids)
                )

            with conn.cursor() as cursor:
                cursor.executemany(self.INSERT_MEMBERSHIP_SQL, memberships)

        return SavedStories(
            created=created,
            updated=updated,
            unchanged=unchanged,
            removed=len(existing - kept),
        )
