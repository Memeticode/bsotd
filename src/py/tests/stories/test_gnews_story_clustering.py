
import unittest
from datetime import date

from news.repository.gnews_daily_article_repository import DailyArticle
from news.repository.gnews_story_repository import SavedStories, StoredStory
from news.stories.gnews_story_clustering import (
    GNewsStoryClustering,
    MissingSimilarityError,
)
from news.stories.story_clustering import (
    ArticlePair,
    AssignmentOverride,
    ClusteringConfiguration,
)

DAY = date(2026, 10, 21)

# 1 and 2 cover one story; 3 another.
PAIRS = [
    ArticlePair(1, 2, 0.90, 0.40),
    ArticlePair(1, 3, 0.50, 0.00),
    ArticlePair(2, 3, 0.50, 0.00),
]


class FakeArticles:
    def get_articles(self, category, published_date):
        return [DailyArticle(i, f"Title {i}", None, None) for i in (1, 2, 3)]


class FakeRepository:
    def __init__(self, pairs=PAIRS, overrides=(), stories=()):
        self.pairs = list(pairs)
        self.overrides = list(overrides)
        self.stories = list(stories)
        self.saved = None

    def get_pairs(self, category, published_date):
        return self.pairs

    def get_overrides(self, article_ids):
        return self.overrides

    def get_stories(self, category, published_date):
        return self.stories

    def save_stories(self, category, published_date, method, version, stories):
        self.saved = stories
        return SavedStories(
            created=sum(s.story_id is None for s in stories),
            updated=sum(s.story_id is not None and s.changed for s in stories),
            unchanged=sum(s.story_id is not None and not s.changed for s in stories),
            removed=0,
        )


class GNewsStoryClusteringTest(unittest.TestCase):
    def cluster(self, repository, dry_run=False):
        return GNewsStoryClustering(
            FakeArticles(), repository, ClusteringConfiguration()
        ).cluster("science", DAY, dry_run=dry_run)

    def test_saves_one_story_per_cluster(self) -> None:
        repository = FakeRepository()

        result = self.cluster(repository)

        self.assertEqual((result.stories, result.stories_created), (2, 2))
        self.assertEqual(
            [s.article_ids for s in repository.saved],
            [frozenset({1, 2}), frozenset({3})],
        )

    def test_continues_existing_stories(self) -> None:
        configuration = ClusteringConfiguration().to_json()
        existing = StoredStory(
            id=40,
            article_ids=frozenset({1, 2}),
            editor_placed=frozenset(),
            clustering_metadata={
                "configuration": configuration,
                "mean_similarity": 0.7,
                "min_similarity": 0.7,
            },
        )
        repository = FakeRepository(stories=[existing])

        result = self.cluster(repository)

        self.assertEqual([s.story_id for s in repository.saved], [40, None])
        self.assertEqual((result.stories_unchanged, result.stories_created), (1, 1))

    def test_reapplies_editors_corrections(self) -> None:
        repository = FakeRepository(overrides=[AssignmentOverride(3, 1)])

        result = self.cluster(repository)

        self.assertEqual(result.editor_placed, 1)
        [story] = repository.saved
        self.assertEqual(story.article_ids, frozenset({1, 2, 3}))
        self.assertEqual(story.editor_placed, frozenset({3}))

    def test_refuses_days_whose_pairs_are_not_all_scored(self) -> None:
        with self.assertRaises(MissingSimilarityError):
            self.cluster(FakeRepository(pairs=PAIRS[:2]))

    def test_dry_runs_do_not_write(self) -> None:
        repository = FakeRepository()

        result = self.cluster(repository, dry_run=True)

        self.assertEqual(result.stories_created, 2)
        self.assertIsNone(repository.saved)


if __name__ == "__main__":
    unittest.main()
