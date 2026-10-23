
import logging
from dataclasses import dataclass
from datetime import date

from news.embedding.text_embedder import TextEmbedder
from news.repository.gnews_article_similarity_repository import (
    GNewsArticleSimilarityRepository,
)
from news.text.input_text import build_input_text, hash_input_text


logger = logging.getLogger(__name__)


class MissingVectorsError(Exception):
    pass


@dataclass(frozen=True)
class SimilarityResult:
    category: str
    published_date: date
    articles_found: int
    pairs_expected: int
    # False when the stored pairs were already scored from the day's
    # current vectors.
    needs_scoring: bool
    pairs_saved: int


class GNewsArticleSimilarity:
    def __init__(
        self,
        repository: GNewsArticleSimilarityRepository,
        embedding_model: str = TextEmbedder.DEFAULT_MODEL,
    ) -> None:
        self._repository = repository
        self._model = embedding_model

    def score(
        self,
        category: str,
        published_date: date,
        dry_run: bool = True,
    ) -> SimilarityResult:
        status = self._repository.get_vector_status(
            category, published_date, self._model
        )

        # Article ID -> hash of its current text, for every article
        # either job has vectorized.
        current = {
            article_id: hash_input_text(build_input_text(*text))
            for article_id, text in sorted(status.articles.items())
        }

        missing_embeddings = [
            article_id
            for article_id, input_hash in current.items()
            if input_hash not in status.embedding_hashes.get(article_id, ())
        ]
        missing_tfidf = [
            article_id
            for article_id, input_hash in current.items()
            if status.tfidf_hashes.get(article_id) != input_hash
        ]

        # Both outputs must cover the same articles, from their current text.
        if missing_embeddings or missing_tfidf:
            raise MissingVectorsError(
                f"{len(missing_embeddings)} articles lack a current "
                f"{self._model} embedding and {len(missing_tfidf)} a current "
                "TF-IDF vector. Run embed_gnews.py and vectorize_gnews.py "
                f"for {category} on {published_date} first."
            )

        expected = len(current) * (len(current) - 1) // 2
        scored = self._repository.get_scored_pairs(category, published_date)

        # Rebuilding a corpus deletes its pairs, so stored pairs from the
        # current corpus and model were scored from current vectors.
        needs_scoring = not (
            scored.pair_count == expected
            and (
                expected == 0
                or (
                    scored.corpus_ids == {status.corpus_id}
                    and scored.embedding_models == {self._model}
                )
            )
        )

        logger.info(
            "%d articles with vectors, %d pairs expected; pairs %s",
            len(current),
            expected,
            "need scoring" if needs_scoring else "are current",
        )

        saved = 0

        if needs_scoring and dry_run:
            logger.info("[DRY RUN] No pairs scored")
        elif needs_scoring:
            saved = self._repository.replace_pairs(
                category=category,
                published_date=published_date,
                model=self._model,
                corpus_id=status.corpus_id,
                input_hashes=current,
            )

            logger.info("Saved %d pairs", saved)

        return SimilarityResult(
            category=category,
            published_date=published_date,
            articles_found=len(current),
            pairs_expected=expected,
            needs_scoring=needs_scoring,
            pairs_saved=saved,
        )
