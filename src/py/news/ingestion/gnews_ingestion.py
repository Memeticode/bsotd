
import logging
import time
from dataclasses import dataclass
from datetime import date

from news.clients.gnews_client import GNewsApiClient, GNewsRequest
from news.repository.gnews_article_repository import (
    GNewsArticleRepository,
    GNewsCollection,
)


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class IngestionResult:
    category: str
    date: date
    total_reported: int
    articles_processed: int
    requests_made: int
    complete: bool


class GNewsIngestion:
    MAX_PAGINATION_ARTICLES = 1000

    def __init__(
        self,
        client: GNewsApiClient,
        repository: GNewsArticleRepository | None,
        request_delay: float = 1.1,
    ) -> None:
        self._client = client
        self._repository = repository
        self._request_delay = request_delay

    def ingest(
        self,
        category: str,
        target_date: date,
        language: str = "en",
        country: str = "us",
        max_requests: int = 10,
        page_size: int = 10,
        dry_run: bool = True,
    ) -> IngestionResult:
        if max_requests < 1:
            raise ValueError("max_requests must be positive")

        if not 1 <= page_size <= 10:
            raise ValueError("page_size must be between 1 and 10")

        if not dry_run and self._repository is None:
            raise ValueError("A repository is required for live ingestion")

        collection = GNewsCollection(
            category=category,
            date=target_date,
            language=language,
            country=country,
        )

        total_reported = 0
        articles_processed = 0
        requests_made = 0
        complete = False

        max_pages = min(
            max_requests,
            self.MAX_PAGINATION_ARTICLES // page_size,
        )

        for page in range(1, max_pages + 1):
            request = GNewsRequest(
                category=category,
                date=target_date,
                language=language,
                country=country,
                page=page,
                max_articles=page_size,
            )

            if dry_run:
                logger.info(
                    "[DRY RUN] Category=%s Date=%s Page=%d",
                    category,
                    target_date,
                    page,
                )

                # One simulated request is enough to verify
                # parameters without knowing the total count.
                logger.info("Parameters: %s", request.to_params())
                break

            if requests_made > 0:
                time.sleep(self._request_delay)

            # Count the attempt before issuing the request.
            requests_made += 1

            response = self._client.get_top_headlines(request)
            total_reported = response.total_articles

            assert self._repository is not None

            saved = self._repository.save_articles(
                response.articles,
                collection,
            )

            articles_processed += saved

            logger.info(
                "Page %d: saved %d articles (%d reported)",
                page,
                saved,
                total_reported,
            )

            # The API reports the total across all pages.
            if (
                not response.articles
                or page * page_size >= total_reported
            ):
                complete = True
                break

        return IngestionResult(
            category=category,
            date=target_date,
            total_reported=total_reported,
            articles_processed=articles_processed,
            requests_made=requests_made,
            complete=complete,
        )

