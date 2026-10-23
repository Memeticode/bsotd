
import unittest

from news.stories.story_relevance import InvalidRatingError, build_prompt, parse_rating
from tests.stories.fakes import article, story

STORY = story(1, article(10), article(11), article(12))


def response(**fields: object) -> dict[str, object]:
    return {
        "category_relevance": 4,
        "importance": 3,
        "different_event_article_ids": [],
        "rationale": " An astronomy finding. ",
        **fields,
    }


class BuildPromptTest(unittest.TestCase):
    def test_describes_the_story_then_its_articles(self) -> None:
        prompt = build_prompt(STORY)

        self.assertTrue(prompt.startswith(
            "Category: science\nPublication date: 2026-10-21 (UTC)\nArticles: 3\n"
        ))
        self.assertIn('<article id="12">', prompt)


class ParseRatingTest(unittest.TestCase):
    def test_reads_scores_and_rationale(self) -> None:
        rating = parse_rating(response(), STORY)

        self.assertEqual(
            (rating.category_relevance, rating.importance, rating.rationale),
            (4, 3, "An astronomy finding."),
        )

    def test_rejects_scores_outside_the_scale(self) -> None:
        for score in (0, 6, "3", None):
            with self.subTest(score=score):
                with self.assertRaises(InvalidRatingError):
                    parse_rating(response(importance=score), STORY)

    def test_rejects_an_empty_rationale(self) -> None:
        with self.assertRaises(InvalidRatingError):
            parse_rating(response(rationale="  "), STORY)

    def test_flags_only_the_storys_own_articles(self) -> None:
        rating = parse_rating(
            response(different_event_article_ids=[12, 99, 12]), STORY
        )

        self.assertEqual(rating.different_event_article_ids, [12])

    def test_ignores_flags_that_cover_every_article(self) -> None:
        rating = parse_rating(
            response(different_event_article_ids=[10, 11, 12]), STORY
        )

        self.assertEqual(rating.different_event_article_ids, [])


if __name__ == "__main__":
    unittest.main()
