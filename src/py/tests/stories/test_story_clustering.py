
import unittest

from news.stories.story_clustering import (
    ArticlePair,
    AssignmentOverride,
    ClusteringConfiguration,
    apply_overrides,
    cluster_articles,
    cohesion,
    hybrid_similarity,
    match_stories,
)

CONFIGURATION = ClusteringConfiguration(
    embedding_weight=0.6,
    tfidf_weight=0.4,
    similarity_threshold=0.45,
)


def pair(a: int, b: int, embedding: float, tfidf: float | None) -> ArticlePair:
    return ArticlePair(a, b, embedding, tfidf)


class HybridSimilarityTest(unittest.TestCase):
    def test_weights_both_similarities(self) -> None:
        self.assertAlmostEqual(
            hybrid_similarity(pair(1, 2, 0.8, 0.5), CONFIGURATION), 0.68
        )

    def test_an_empty_tfidf_vector_counts_as_no_overlap(self) -> None:
        self.assertAlmostEqual(
            hybrid_similarity(pair(1, 2, 0.8, None), CONFIGURATION), 0.48
        )


class ClusterArticlesTest(unittest.TestCase):
    def test_groups_articles_on_the_same_story(self) -> None:
        # 1, 2 and 3 cover one story; 4 is on a related topic.
        pairs = [
            pair(1, 2, 0.88, 0.27),
            pair(1, 3, 0.83, 0.31),
            pair(2, 3, 0.81, 0.19),
            pair(1, 4, 0.67, 0.05),
            pair(2, 4, 0.65, 0.02),
            pair(3, 4, 0.62, 0.00),
        ]

        self.assertEqual(
            cluster_articles([4, 3, 2, 1], pairs, CONFIGURATION),
            [frozenset({1, 2, 3}), frozenset({4})],
        )

    def test_merges_only_while_the_average_similarity_is_high_enough(self) -> None:
        # 3 is close to 1 but far from 2, so on average it stays apart.
        pairs = [
            pair(1, 2, 0.90, 0.40),
            pair(1, 3, 0.80, 0.20),
            pair(2, 3, 0.40, 0.00),
        ]

        self.assertEqual(
            cluster_articles([1, 2, 3], pairs, CONFIGURATION),
            [frozenset({1, 2}), frozenset({3})],
        )

    def test_unscored_pairs_count_as_unrelated(self) -> None:
        self.assertEqual(
            cluster_articles([1, 2], [], CONFIGURATION),
            [frozenset({1}), frozenset({2})],
        )

    def test_handles_days_with_one_article_or_none(self) -> None:
        self.assertEqual(cluster_articles([7], [], CONFIGURATION), [frozenset({7})])
        self.assertEqual(cluster_articles([], [], CONFIGURATION), [])


class ApplyOverridesTest(unittest.TestCase):
    CLUSTERS = [frozenset({1, 2, 3}), frozenset({4})]

    def test_moves_an_article_into_another_articles_story(self) -> None:
        stories, placed = apply_overrides(
            self.CLUSTERS, [AssignmentOverride(3, together_with_article_id=4)]
        )

        self.assertEqual(stories, [frozenset({1, 2}), frozenset({3, 4})])
        self.assertEqual(placed, {3})

    def test_splits_an_article_into_a_story_of_its_own(self) -> None:
        stories, placed = apply_overrides(
            self.CLUSTERS, [AssignmentOverride(2, together_with_article_id=None)]
        )

        self.assertEqual(
            stories, [frozenset({1, 3}), frozenset({4}), frozenset({2})]
        )
        self.assertEqual(placed, {2})

    def test_replays_corrections_in_order(self) -> None:
        stories, _ = apply_overrides(
            self.CLUSTERS,
            [
                AssignmentOverride(1, together_with_article_id=None),
                AssignmentOverride(4, together_with_article_id=1),
            ],
        )

        self.assertEqual(stories, [frozenset({2, 3}), frozenset({1, 4})])

    def test_ignores_corrections_for_other_days_articles(self) -> None:
        stories, placed = apply_overrides(
            self.CLUSTERS,
            [
                AssignmentOverride(9, together_with_article_id=None),
                AssignmentOverride(1, together_with_article_id=9),
            ],
        )

        self.assertEqual(stories, list(self.CLUSTERS))
        self.assertEqual(placed, set())


class MatchStoriesTest(unittest.TestCase):
    def test_a_story_keeps_its_id_as_articles_join(self) -> None:
        self.assertEqual(
            match_stories(
                {10: frozenset({1, 2}), 11: frozenset({3})},
                [frozenset({1, 2, 4}), frozenset({3})],
            ),
            [10, 11],
        )

    def test_mostly_new_groups_become_new_stories(self) -> None:
        # Sharing one of three articles is less than half of the two.
        self.assertEqual(
            match_stories({10: frozenset({1})}, [frozenset({1, 2, 3})]),
            [None],
        )

    def test_a_split_story_continues_into_one_part_only(self) -> None:
        self.assertEqual(
            match_stories(
                {10: frozenset({1, 2, 3})},
                [frozenset({1, 2}), frozenset({3})],
            ),
            [10, None],
        )


class CohesionTest(unittest.TestCase):
    def test_reports_mean_and_lowest_similarity(self) -> None:
        similarities = {
            frozenset({1, 2}): 0.6,
            frozenset({1, 3}): 0.5,
            frozenset({2, 3}): 0.4,
        }

        self.assertEqual(
            cohesion(frozenset({1, 2, 3}), similarities),
            {"mean_similarity": 0.5, "min_similarity": 0.4},
        )

    def test_is_undefined_for_one_article(self) -> None:
        self.assertEqual(
            cohesion(frozenset({1}), {}),
            {"mean_similarity": None, "min_similarity": None},
        )


if __name__ == "__main__":
    unittest.main()
