
import re
import unittest

from news.tfidf.tfidf_corpus import TfidfConfiguration, fit_corpus, to_sparsevec


class ToSparsevecTest(unittest.TestCase):
    def test_numbers_dimensions_from_one(self) -> None:
        self.assertEqual(to_sparsevec([0, 2], [0.5, 0.25], 5), "{1:0.5,3:0.25}/5")

    def test_an_empty_vector_keeps_its_dimensions(self) -> None:
        self.assertEqual(to_sparsevec([], [], 5), "{}/5")


class FitCorpusTest(unittest.TestCase):
    TEXTS = [
        "Orionid meteor shower peaks tonight",
        "How to watch the Orionid meteor shower",
        "SpaceX launch rescheduled to Tuesday",
    ]

    def test_fits_one_vector_per_text_over_a_shared_vocabulary(self) -> None:
        corpus = fit_corpus(self.TEXTS, TfidfConfiguration())
        dimensions = len(corpus.vocabulary)

        self.assertEqual(len(corpus.vectors), 3)
        self.assertEqual(len(corpus.idf_weights), dimensions)
        self.assertEqual(
            sorted(corpus.vocabulary.values()), list(range(dimensions))
        )

        for vector in corpus.vectors:
            self.assertRegex(vector, rf"^\{{(\d+:[^,}}]+,?)+\}}/{dimensions}$")

    def test_vectors_are_unit_length_with_ascending_indices(self) -> None:
        corpus = fit_corpus(self.TEXTS, TfidfConfiguration())

        for vector in corpus.vectors:
            entries = re.findall(r"(\d+):([^,}]+)", vector)
            indices = [int(index) for index, _ in entries]
            norm = sum(float(value) ** 2 for _, value in entries) ** 0.5

            self.assertEqual(indices, sorted(indices))
            self.assertAlmostEqual(norm, 1.0, places=5)

    def test_word_pairs_are_terms(self) -> None:
        corpus = fit_corpus(self.TEXTS, TfidfConfiguration())

        self.assertIn("meteor shower", corpus.vocabulary)
        # English stop words are dropped.
        self.assertNotIn("the", corpus.vocabulary)


class TfidfConfigurationTest(unittest.TestCase):
    def test_records_its_settings_and_library_version(self) -> None:
        settings = TfidfConfiguration().to_json()

        self.assertEqual(settings["ngram_range"], [1, 2])
        self.assertEqual(settings["input"], "title and description")
        self.assertIn("scikit_learn", settings)


if __name__ == "__main__":
    unittest.main()
