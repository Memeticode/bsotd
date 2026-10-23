
import unittest

from news.stories.story import format_articles, hash_prompt
from tests.stories.fakes import article


class FormatArticlesTest(unittest.TestCase):
    def test_tags_each_article_with_its_id_and_fields(self) -> None:
        text = format_articles([article(5, "WMUR")], content_characters=100)

        self.assertEqual(
            text,
            "\n".join([
                '<article id="5">',
                "Outlet: WMUR",
                "Published: 2026-10-21 09:55 UTC",
                "Title: Title 5",
                "Description: Description 5",
                "Content:",
                "Content 5",
                "</article>",
            ]),
        )

    def test_lists_other_outlets_that_ran_the_same_text(self) -> None:
        text = format_articles(
            [article(5, "WMUR", carried_by=("WMUR", "KOCO", "WESH"))],
            content_characters=100,
        )

        self.assertIn("Outlet: WMUR\nSame text also run by: KOCO, WESH\n", text)

    def test_shortens_long_content(self) -> None:
        text = format_articles(
            [article(5, content="word " * 100)], content_characters=20
        )

        self.assertIn("Content:\nword word word word […]\n", text)

    def test_leaves_out_content_when_asked_for_none(self) -> None:
        self.assertNotIn(
            "Content:", format_articles([article(5)], content_characters=0)
        )


class HashPromptTest(unittest.TestCase):
    def test_changes_with_any_part(self) -> None:
        self.assertNotEqual(hash_prompt("a", "bc"), hash_prompt("ab", "c"))
        self.assertEqual(hash_prompt("a", "b"), hash_prompt("a", "b"))


if __name__ == "__main__":
    unittest.main()
