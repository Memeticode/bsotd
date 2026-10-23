
import unittest
from typing import Any

from news.stories.story_analysis import InvalidAnalysisError, check_analysis
from tests.stories.fakes import article, story

STORY = story(1, article(10), article(11), article(12))


def source(article_id: int, stance: str = "supports") -> dict[str, Any]:
    return {"article_id": article_id, "stance": stance, "evidence": " quote "}


def response(**fields: Any) -> dict[str, Any]:
    return {
        "headline": "Headline",
        "summary": "Summary.",
        "takeaways": ["One", " "],
        "claims": [
            {
                "statement": "A claim.",
                "kind": "fact",
                "sources": [source(10), source(11, "contradicts")],
            },
        ],
        "syndicated_copies": [],
        "framing": [{"article_id": 10, "framing": "Leads with the finding."}],
        **fields,
    }


class CheckAnalysisTest(unittest.TestCase):
    def test_keeps_a_valid_analysis(self) -> None:
        checked = check_analysis(response(), STORY)

        self.assertEqual(checked.problems, [])
        self.assertEqual(checked.analysis["takeaways"], ["One"])
        self.assertEqual(
            checked.analysis["claims"][0]["sources"],
            [
                {"article_id": 10, "stance": "supports", "evidence": "quote"},
                {"article_id": 11, "stance": "contradicts", "evidence": "quote"},
            ],
        )

    def test_drops_sources_from_other_stories_and_repeats(self) -> None:
        claim = {
            "statement": "A claim.",
            "kind": "fact",
            "sources": [source(10), source(99), source(10, "contradicts")],
        }

        checked = check_analysis(response(claims=[claim]), STORY)

        self.assertEqual(
            [s["article_id"] for s in checked.analysis["claims"][0]["sources"]],
            [10],
        )
        self.assertEqual(len(checked.problems), 2)

    def test_drops_claims_left_without_sources(self) -> None:
        claims = [
            {"statement": "Unsourced.", "kind": "fact", "sources": [source(99)]},
            {"statement": "Sourced.", "kind": "interpretation", "sources": [source(12)]},
        ]

        checked = check_analysis(response(claims=claims), STORY)

        self.assertEqual(
            [c["statement"] for c in checked.analysis["claims"]], ["Sourced."]
        )

    def test_rejects_analyses_without_usable_claims(self) -> None:
        with self.assertRaises(InvalidAnalysisError):
            check_analysis(response(claims=[]), STORY)

    def test_rejects_analyses_without_a_headline(self) -> None:
        with self.assertRaises(InvalidAnalysisError):
            check_analysis(response(headline=" "), STORY)

    def test_keeps_groups_of_two_or_more_copies_each_article_once(self) -> None:
        copies = [
            {"article_ids": [11, 10, 99], "basis": "Same wire report."},
            {"article_ids": [11, 12], "basis": "Overlaps the first group."},
        ]

        checked = check_analysis(response(syndicated_copies=copies), STORY)

        self.assertEqual(
            checked.analysis["syndicated_copies"],
            [{"article_ids": [10, 11], "basis": "Same wire report."}],
        )

    def test_keeps_one_framing_note_per_article(self) -> None:
        framing = [
            {"article_id": 12, "framing": "Second."},
            {"article_id": 10, "framing": "First."},
            {"article_id": 10, "framing": "Repeat."},
            {"article_id": 99, "framing": "Other story."},
        ]

        checked = check_analysis(response(framing=framing), STORY)

        self.assertEqual(
            checked.analysis["framing"],
            [
                {"article_id": 10, "framing": "First."},
                {"article_id": 12, "framing": "Second."},
            ],
        )


if __name__ == "__main__":
    unittest.main()
