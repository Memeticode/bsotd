
import logging
from dataclasses import dataclass
from datetime import date

from news.repository.gnews_daily_article_repository import (
    GNewsDailyArticleRepository,
)
from news.repository.gnews_story_repository import (
    GNewsStoryRepository,
    PlannedStory,
)
from news.stories.story_clustering import (
    ClusteringConfiguration,
    apply_overrides,
    cluster_articles,
    cohesion,
    hybrid_similarity,
    match_stories,
)
from news.text.input_text import build_input_text


logger = logging.getLogger(__name__)


class MissingSimilarityError(Exception):
    pass


@dataclass(frozen=True)
class ClusteringResult:
    category: str
    published_date: date
    articles_found: int
    stories: int
    # Articles placed by editors' corrections rather than the model.
    editor_placed: int
    stories_created: int
    stories_updated: int
    stories_unchanged: int
    stories_removed: int


class GNewsStoryClustering:
    def __init__(
        self,
        articles: GNewsDailyArticleRepository,
        repository: GNewsStoryRepository,
        configuration: ClusteringConfiguration = ClusteringConfiguration(),
    ) -> None:
        self._articles = articles
        self._repository = repository
        self._configuration = configuration

    def cluster(
        self,
        category: str,
        published_date: date,
        dry_run: bool = True,
    ) -> ClusteringResult:
        # Articles without text have no vectors, as in the earlier jobs.
        article_ids = [
            article.id
            for article in self._articles.get_articles(category, published_date)
            if build_input_text(
                article.title, article.description, article.content
            )
        ]

        pairs = self._repository.get_pairs(category, published_date)

        expected = {
            frozenset((a, b))
            for index, a in enumerate(article_ids)
            for b in article_ids[index + 1:]
        }
        scored = {frozenset((p.article_a_id, p.article_b_id)) for p in pairs}

        if scored != expected:
            raise MissingSimilarityError(
                f"{len(scored)} pairs are scored for {category} on "
                f"{published_date}, but its {len(article_ids)} articles "
                f"make {len(expected)}. Run score_gnews.py for the day first."
            )

        clusters = cluster_articles(article_ids, pairs, self._configuration)
        clusters, editor_placed = apply_overrides(
            clusters, self._repository.get_overrides(article_ids)
        )

        similarities = {
            frozenset((p.article_a_id, p.article_b_id)):
                hybrid_similarity(p, self._configuration)
            for p in pairs
        }

        previous = {
            story.id: story
            for story in self._repository.get_stories(category, published_date)
        }
        matches = match_stories(
            {story_id: story.article_ids for story_id, story in previous.items()},
            clusters,
        )

        planned = []

        for story_id, members in zip(matches, clusters):
            metadata = {
                "configuration": self._configuration.to_json(),
                **cohesion(members, similarities),
            }
            placed = frozenset(members & editor_placed)
            stored = previous.get(story_id) if story_id is not None else None

            planned.append(PlannedStory(
                story_id=story_id,
                article_ids=members,
                editor_placed=placed,
                clustering_metadata=metadata,
                changed=stored is None or (
                    stored.article_ids != members
                    or stored.editor_placed != placed
                    or stored.clustering_metadata != metadata
                ),
            ))

        continued = {story.story_id for story in planned} - {None}
        created = sum(story.story_id is None for story in planned)
        updated = sum(
            story.story_id is not None and story.changed for story in planned
        )
        removed = len(previous.keys() - continued)

        logger.info(
            "%d articles in %d stories: %d new, %d changed, %d removed",
            len(article_ids),
            len(clusters),
            created,
            updated,
            removed,
        )

        if dry_run:
            logger.info("[DRY RUN] No stories saved")
        else:
            saved = self._repository.save_stories(
                category=category,
                published_date=published_date,
                method=self._configuration.method,
                version=self._configuration.version,
                stories=planned,
            )
            created, updated, removed = saved.created, saved.updated, saved.removed

        return ClusteringResult(
            category=category,
            published_date=published_date,
            articles_found=len(article_ids),
            stories=len(clusters),
            editor_placed=len(editor_placed),
            stories_created=created,
            stories_updated=updated,
            stories_unchanged=len(planned) - created - updated,
            stories_removed=removed,
        )
