
import unittest
from datetime import date

from news.repository.gnews_article_similarity_repository import (
    ScoredPairs,
    VectorStatus,
)
from news.similarity.gnews_article_similarity import (
    GNewsArticleSimilarity,
    MissingVectorsError,
)
from news.text.input_text import build_input_text, hash_input_text

MODEL = "embedding-test"
DAY = date(2026, 10, 21)

TEXTS = {
    1: ("One", "First", "Body one."),
    2: ("Two", "Second", None),
    3: ("Three", "Third", "Body three."),
}

HASHES = {
    article_id: hash_input_text(build_input_text(*text))
    for article_id, text in TEXTS.items()
}

NOTHING_SCORED = ScoredPairs(0, frozenset(), frozenset())


class FakeRepository:
    def __init__(self, status, scored=NOTHING_SCORED):
        self.status = status
        self.scored = scored
        self.replaced = None

    def get_vector_status(self, category, published_date, model):
        return self.status

    def get_scored_pairs(self, category, published_date):
        return self.scored

    def replace_pairs(self, category, published_date, model, corpus_id, input_hashes):
        self.replaced = (corpus_id, input_hashes)
        return len(input_hashes) * (len(input_hashes) - 1) // 2


def current_vectors(corpus_id=7):
    return VectorStatus(
        articles=dict(TEXTS),
        embedding_hashes={i: frozenset({h}) for i, h in HASHES.items()},
        corpus_id=corpus_id,
        tfidf_hashes=dict(HASHES),
    )


class GNewsArticleSimilarityTest(unittest.TestCase):
    def score(self, repository, dry_run=False):
        return GNewsArticleSimilarity(repository, MODEL).score(
            "science", DAY, dry_run=dry_run
        )

    def test_scores_every_pair_of_vectorized_articles(self) -> None:
        repository = FakeRepository(current_vectors())

        result = self.score(repository)

        self.assertEqual((result.pairs_expected, result.pairs_saved), (3, 3))
        self.assertEqual(repository.replaced, (7, HASHES))

    def test_stored_pairs_from_the_current_corpus_are_current(self) -> None:
        repository = FakeRepository(
            current_vectors(), ScoredPairs(3, frozenset({7}), frozenset({MODEL}))
        )

        result = self.score(repository)

        self.assertFalse(result.needs_scoring)
        self.assertIsNone(repository.replaced)

    def test_pairs_from_an_older_corpus_are_scored_again(self) -> None:
        repository = FakeRepository(
            current_vectors(corpus_id=8),
            ScoredPairs(3, frozenset({7}), frozenset({MODEL})),
        )

        self.assertTrue(self.score(repository).needs_scoring)

    def test_refuses_articles_with_outdated_vectors(self) -> None:
        status = current_vectors()
        status.tfidf_hashes[2] = "an older text's hash"

        with self.assertRaises(MissingVectorsError):
            self.score(FakeRepository(status))

    def test_refuses_articles_with_only_one_kind_of_vector(self) -> None:
        status = current_vectors()
        del status.embedding_hashes[3]

        with self.assertRaises(MissingVectorsError):
            self.score(FakeRepository(status))

    def test_dry_runs_do_not_write(self) -> None:
        repository = FakeRepository(current_vectors())

        result = self.score(repository, dry_run=True)

        self.assertTrue(result.needs_scoring)
        self.assertIsNone(repository.replaced)


if __name__ == "__main__":
    unittest.main()
