
import unittest
from datetime import date

from news.stories.gnews_story_relevance import GNewsStoryRelevance
from tests.stories.fakes import ClaudeError, FakeLlm, article, story

MODEL = "claude-test"
DAY = date(2026, 10, 21)

RATING = {
    "category_relevance": 5,
    "importance": 4,
    "different_event_article_ids": [],
    "rationale": "A landmark finding.",
}


class FakeRepository:
    def __init__(self, *stories):
        self.stories = list(stories)
        self.saved = []

    def get_stories(self, category, published_date):
        return self.stories

    def get_input_hashes(self, story_ids, model, criteria_version):
        hashes = {}

        for rating in self.saved:
            hashes.setdefault(rating.story_id, set()).add(rating.input_hash)

        return hashes

    def save_rating(self, rating):
        self.saved.append(rating)


class GNewsStoryRelevanceTest(unittest.TestCase):
    def test_rates_each_story_and_records_what_was_rated(self) -> None:
        repository = FakeRepository(story(1, article(10), article(11)))
        llm = FakeLlm(MODEL, RATING)

        result = GNewsStoryRelevance(repository, llm, MODEL).rate(
            "science", DAY, dry_run=False
        )

        self.assertEqual((result.ratings_saved, result.ratings_failed), (1, 0))
        [saved] = repository.saved
        self.assertEqual(
            (saved.story_id, saved.article_ids, saved.importance, saved.model),
            (1, [10, 11], 4, MODEL),
        )

    def test_skips_stories_already_rated_from_the_same_prompt(self) -> None:
        repository = FakeRepository(story(1, article(10)))
        GNewsStoryRelevance(repository, FakeLlm(MODEL, RATING), MODEL).rate(
            "science", DAY, dry_run=False
        )

        result = GNewsStoryRelevance(repository, FakeLlm(MODEL), MODEL).rate(
            "science", DAY, dry_run=False
        )

        self.assertEqual((result.already_rated, result.ratings_saved), (1, 0))

    def test_rates_again_when_a_storys_articles_change(self) -> None:
        repository = FakeRepository(story(1, article(10)))
        GNewsStoryRelevance(repository, FakeLlm(MODEL, RATING), MODEL).rate(
            "science", DAY, dry_run=False
        )
        repository.stories = [story(1, article(10), article(11))]

        result = GNewsStoryRelevance(repository, FakeLlm(MODEL, RATING), MODEL).rate(
            "science", DAY, dry_run=False
        )

        self.assertEqual(result.ratings_saved, 1)

    def test_a_failed_story_does_not_stop_the_others(self) -> None:
        repository = FakeRepository(story(1, article(10)), story(2, article(20)))
        llm = FakeLlm(MODEL, ClaudeError("Claude stopped early (refusal)"), RATING)

        with self.assertLogs("news.stories.gnews_story_relevance", "ERROR") as logs:
            result = GNewsStoryRelevance(repository, llm, MODEL).rate(
                "science", DAY, dry_run=False
            )

        self.assertIn("Story 1 not rated", logs.output[0])
        self.assertEqual((result.ratings_saved, result.ratings_failed), (1, 1))
        self.assertEqual([r.story_id for r in repository.saved], [2])

    def test_dry_runs_report_pending_stories_without_calling_the_model(self) -> None:
        repository = FakeRepository(story(1, article(10)))

        result = GNewsStoryRelevance(repository, None, MODEL).rate("science", DAY)

        self.assertEqual((result.already_rated, result.ratings_saved), (0, 0))


if __name__ == "__main__":
    unittest.main()
