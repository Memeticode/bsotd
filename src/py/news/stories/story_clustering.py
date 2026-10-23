
from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass
from itertools import combinations
from typing import Any

import numpy as np
from sklearn.cluster import AgglomerativeClustering


@dataclass(frozen=True)
class ClusteringConfiguration:
    """How a day's articles are grouped into stories.

    Pairs are compared by a weighted mix of embedding and TF-IDF cosine
    similarity, and groups merge while their average pairwise similarity
    is above the threshold. The defaults were calibrated on six days of
    science articles: same-story pairs scored 0.46 to 0.63 and pairs on
    merely related topics 0.42 or less. Erring towards splits keeps
    similar topics from passing as one story.
    """

    method: str = "agglomerative-average-linkage"
    version: str = "1"
    embedding_weight: float = 0.6
    tfidf_weight: float = 0.4
    similarity_threshold: float = 0.45

    def to_json(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ArticlePair:
    article_a_id: int
    article_b_id: int
    embedding_similarity: float
    # None when either article's TF-IDF vector is empty.
    tfidf_similarity: float | None


@dataclass(frozen=True)
class AssignmentOverride:
    article_id: int
    # The article to share a story with, or None for a story of its own.
    together_with_article_id: int | None


def hybrid_similarity(
    pair: ArticlePair,
    configuration: ClusteringConfiguration,
) -> float:
    return (
        configuration.embedding_weight * pair.embedding_similarity
        + configuration.tfidf_weight * (pair.tfidf_similarity or 0.0)
    )


def cluster_articles(
    article_ids: Sequence[int],
    pairs: Sequence[ArticlePair],
    configuration: ClusteringConfiguration,
) -> list[frozenset[int]]:
    """Groups articles into stories, ordered by their lowest article ID.

    Pairs missing from `pairs` count as entirely dissimilar.
    """
    ids = sorted(set(article_ids))

    if len(ids) < 2:
        return [frozenset(ids)] if ids else []

    index = {article_id: position for position, article_id in enumerate(ids)}
    distances = np.ones((len(ids), len(ids)))
    np.fill_diagonal(distances, 0.0)

    for pair in pairs:
        a, b = index[pair.article_a_id], index[pair.article_b_id]
        distance = max(0.0, 1.0 - hybrid_similarity(pair, configuration))
        distances[a, b] = distances[b, a] = distance

    labels = AgglomerativeClustering(
        n_clusters=None,
        metric="precomputed",
        linkage="average",
        distance_threshold=1.0 - configuration.similarity_threshold,
    ).fit_predict(distances)

    groups: dict[int, set[int]] = {}

    for article_id, label in zip(ids, labels):
        groups.setdefault(int(label), set()).add(article_id)

    return sorted((frozenset(group) for group in groups.values()), key=min)


def apply_overrides(
    clusters: Sequence[frozenset[int]],
    overrides: Sequence[AssignmentOverride],
) -> tuple[list[frozenset[int]], set[int]]:
    """Replays editors' corrections in the order they were made: each
    moves an article into another article's story, or into a story of
    its own. Corrections that mention articles outside the clusters are
    ignored.

    Returns the corrected stories and the articles editors placed.
    """
    groups = [set(cluster) for cluster in clusters]
    story_of = {
        article_id: position
        for position, group in enumerate(groups)
        for article_id in group
    }
    placed: set[int] = set()

    for override in overrides:
        target = override.together_with_article_id

        if override.article_id not in story_of or (
            target is not None and target not in story_of
        ):
            continue

        groups[story_of[override.article_id]].discard(override.article_id)

        if target is None:
            groups.append({override.article_id})
            story_of[override.article_id] = len(groups) - 1
        else:
            groups[story_of[target]].add(override.article_id)
            story_of[override.article_id] = story_of[target]

        placed.add(override.article_id)

    return [frozenset(group) for group in groups if group], placed


def match_stories(
    previous: Mapping[int, frozenset[int]],
    clusters: Sequence[frozenset[int]],
) -> list[int | None]:
    """For each cluster, the ID of the existing story it continues, if any.

    A cluster continues the story it shares the most articles with,
    provided they share at least half of their articles combined
    (a Jaccard index of 0.5 or more), so stories keep their IDs, and the
    ratings, analyses and corrections attached to them, as articles are
    added or moved. Each story continues into at most one cluster.
    """
    candidates = []

    for story_id, members in previous.items():
        for position, cluster in enumerate(clusters):
            shared = len(members & cluster)
            jaccard = shared / len(members | cluster) if shared else 0.0

            if jaccard >= 0.5:
                candidates.append((-jaccard, -shared, story_id, position))

    matches: list[int | None] = [None] * len(clusters)
    taken: set[int] = set()

    for _, _, story_id, position in sorted(candidates):
        if story_id not in taken and matches[position] is None:
            matches[position] = story_id
            taken.add(story_id)

    return matches


def cohesion(
    members: frozenset[int],
    similarities: Mapping[frozenset[int], float],
) -> dict[str, float | None]:
    """The mean and lowest hybrid similarity among a story's articles."""
    values = [
        similarities.get(frozenset(pair), 0.0)
        for pair in combinations(sorted(members), 2)
    ]

    if not values:
        return {"mean_similarity": None, "min_similarity": None}

    return {
        "mean_similarity": round(sum(values) / len(values), 4),
        "min_similarity": round(min(values), 4),
    }
