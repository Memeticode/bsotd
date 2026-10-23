
import unittest

from news.text.input_text import (
    OPENING_CHARACTERS,
    build_input_text,
    hash_input_text,
    opening,
)


class BuildInputTextTest(unittest.TestCase):
    def test_puts_title_description_and_opening_on_separate_lines(self) -> None:
        self.assertEqual(
            build_input_text("  Title ", "Description\n", " Content."),
            "Title\nDescription\nContent.",
        )

    def test_skips_missing_parts(self) -> None:
        self.assertEqual(build_input_text(None, "Description", None), "Description")
        self.assertEqual(build_input_text("Title", "   ", ""), "Title")
        self.assertEqual(build_input_text(None, None, None), "")


class OpeningTest(unittest.TestCase):
    def test_keeps_short_content_whole(self) -> None:
        self.assertEqual(opening("The Orionids peak tonight."), "The Orionids peak tonight.")

    def test_cuts_long_content_at_the_end_of_a_word(self) -> None:
        text = "word " * 100
        cut = opening(text)

        self.assertLessEqual(len(cut), OPENING_CHARACTERS)
        self.assertTrue(cut.endswith("word"))
        self.assertEqual(cut, text[:len(cut)])

    def test_cuts_unbroken_content_at_the_limit(self) -> None:
        self.assertEqual(len(opening("x" * 1000)), OPENING_CHARACTERS)


class HashInputTextTest(unittest.TestCase):
    def test_is_the_sha256_of_the_text(self) -> None:
        self.assertEqual(
            hash_input_text("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        )


if __name__ == "__main__":
    unittest.main()
