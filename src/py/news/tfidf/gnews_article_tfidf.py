
import logging
from dataclasses import dataclass
from datetime import date

from news.repository.gnews_article_tfidf_repository import (
    GNewsArticleTfidfRepository,
    TfidfDocument,
)
from news.repository.gnews_daily_article_repository import (
    GNewsDailyArticleRepository,
)
from news.text.input_text import build_input_text, hash_input_text
from news.tfidf.tfidf_corpus import TfidfConfiguration, fit_corpus


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TfidfResult:
    category: str
    published_date: date
    articles_found: int
    # False when the stored corpus already matches the day's articles
    # and the configuration.
    needs_fitting: bool
    vectors_saved: int


class GNewsArticleTfidf:
    def __init__(
        self,
        articles: GNewsDailyArticleRepository,
        repository: GNewsArticleTfidfRepository,
        configuration: TfidfConfiguration = TfidfConfiguration(),
    ) -> None:
        self._articles = articles
        self._repository = repository
        self._configuration = configuration

    def vectorize(
        self,
        category: str,
        published_date: date,
        dry_run: bool = True,
    ) -> TfidfResult:
        articles = self._articles.get_articles(category, published_date)

        # (article ID, text, input hash) for articles with text.
        documents: list[tuple[int, str, str]] = []

        for article in articles:
            text = build_input_text(
                article.title, article.description, article.content
            )

            if not text:
                logger.warning(
                    "Article %d has no text; skipping",
                    article.id,
                )
                continue

            documents.append((article.id, text, hash_input_text(text)))

        # A corpus is current when it was fitted the same way on
        # exactly the day's current texts.
        stored = self._repository.get_corpus(category, published_date)
        current = {article_id: input_hash for article_id, _, input_hash in documents}
        configuration = self._configuration.to_json()

        needs_fitting = bool(documents) and (
            stored is None
            or stored.configuration != configuration
            or stored.input_hashes != current
        )

        logger.info(
            "%d articles found; corpus %s",
            len(articles),
            "needs fitting" if needs_fitting else "is current",
        )

        saved = 0

        if needs_fitting and dry_run:
            logger.info("[DRY RUN] No corpus fitted")
        elif needs_fitting:
            fitted = fit_corpus(
                [text for _, text, _ in documents],
                self._configuration,
            )

            corpus_id = self._repository.replace_corpus(
                category=category,
                published_date=published_date,
                configuration=configuration,
                vocabulary=fitted.vocabulary,
                idf_weights=fitted.idf_weights,
                documents=[
                    TfidfDocument(
                        gnews_article_id=article_id,
                        input_hash=input_hash,
                        tfidf=vector,
                    )
                    for (article_id, _, input_hash), vector
                    in zip(documents, fitted.vectors, strict=True)
                ],
            )

            saved = len(documents)

            logger.info(
                "Saved corpus %d: %d terms, %d vectors",
                corpus_id,
                len(fitted.vocabulary),
                saved,
            )

        return TfidfResult(
            category=category,
            published_date=published_date,
            articles_found=len(articles),
            needs_fitting=needs_fitting,
            vectors_saved=saved,
        )
