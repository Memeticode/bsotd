
import unittest

from news.text.input_text import build_input_text, hash_input_text


class BuildInputTextTest(unittest.TestCase):
    def test_joins_title_and_description_on_separate_lines(self) -> None:
        self.assertEqual(
            build_input_text("  Title ", "Description\n"),
            "Title\nDescription",
        )

    def test_skips_missing_parts(self) -> None:
        self.assertEqual(build_input_text(None, "Description"), "Description")
        self.assertEqual(build_input_text("Title", "   "), "Title")
        self.assertEqual(build_input_text(None, None), "")


class HashInputTextTest(unittest.TestCase):
    def test_is_the_sha256_of_the_text(self) -> None:
        self.assertEqual(
            hash_input_text("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        )


if __name__ == "__main__":
    unittest.main()
