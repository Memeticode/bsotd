
import hashlib
import logging
from dataclasses import dataclass
from datetime import date

from news.embedding.text_embedder import TextEmbedder
from news.repository.gnews_article_embedding_repository import (
    ArticleEmbedding,
    EmbeddingCandidate,
    GNewsArticleEmbeddingRepository,
)


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmbeddingResult:
    category: str
    date: date
    model: str
    articles_found: int
    already_embedded: int
    embeddings_saved: int


def build_input_text(candidate: EmbeddingCandidate) -> str:
    parts = [
        (candidate.title or "").strip(),
        (candidate.description or "").strip(),
    ]
    return "\n".join(part for part in parts if part)


def hash_input_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class GNewsArticleEmbedding:
    def __init__(
        self,
        repository: GNewsArticleEmbeddingRepository,
        embedder: TextEmbedder | None,
        model: str = TextEmbedder.DEFAULT_MODEL,
        batch_size: int = 64,
    ) -> None:
        if embedder is not None and embedder.model != model:
            raise ValueError("Embedder model does not match model")

        self._repository = repository
        self._embedder = embedder
        self._model = model
        self._batch_size = batch_size

    def embed(
        self,
        category: str,
        target_date: date,
        language: str = "en",
        country: str = "us",
        dry_run: bool = True,
    ) -> EmbeddingResult:
        if not dry_run and self._embedder is None:
            raise ValueError("An embedder is required for live embedding")

        candidates = self._repository.get_candidates(
            category=category,
            collection_date=target_date,
            model=self._model,
            language=language,
            country=country,
        )

        # An article needs a new vector when its current title and
        # description haven't been embedded with this model yet.
        pending: list[tuple[EmbeddingCandidate, str, str]] = []

        for candidate in candidates:
            text = build_input_text(candidate)

            if not text:
                logger.warning(
                    "Article %d has no title or description; skipping",
                    candidate.gnews_article_id,
                )
                continue

            input_hash = hash_input_text(text)

            if input_hash not in candidate.existing_input_hashes:
                pending.append((candidate, text, input_hash))

        already_embedded = len(candidates) - len(pending)

        logger.info(
            "%d articles found, %d already embedded, %d pending",
            len(candidates),
            already_embedded,
            len(pending),
        )

        saved = 0

        if dry_run:
            logger.info("[DRY RUN] No embeddings generated")
        else:
            assert self._embedder is not None

            for start in range(0, len(pending), self._batch_size):
                batch = pending[start:start + self._batch_size]

                vectors = self._embedder.embed(
                    [text for _, text, _ in batch]
                )

                saved += self._repository.save_embeddings([
                    ArticleEmbedding(
                        gnews_article_id=candidate.gnews_article_id,
                        model=self._model,
                        input_hash=input_hash,
                        embedding=vector,
                    )
                    for (candidate, _, input_hash), vector
                    in zip(batch, vectors, strict=True)
                ])

                logger.info("Saved %d of %d embeddings", saved, len(pending))

        return EmbeddingResult(
            category=category,
            date=target_date,
            model=self._model,
            articles_found=len(candidates),
            already_embedded=already_embedded,
            embeddings_saved=saved,
        )
