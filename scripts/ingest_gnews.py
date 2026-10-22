
import argparse
import logging
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Make the src/py packages importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "py"))

from news.clients.gnews_client import GNewsApiClient
from news.ingestion.gnews_ingestion import GNewsIngestion
from news.repository.gnews_article_repository import (
    GNewsArticleRepository,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest GNews headlines into PostgreSQL."
    )

    parser.add_argument(
        "--category",
        default="science",
        help="GNews category (default: science)",
    )

    parser.add_argument(
        "--date",
        type=date.fromisoformat,
        default=datetime.now(timezone.utc).date(),
        help="UTC collection date: YYYY-MM-DD",
    )

    parser.add_argument("--language", default="en")
    parser.add_argument("--country", default="us")

    parser.add_argument(
        "--max-requests",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--page-size",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually make API requests and write to PostgreSQL",
    )

    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    # HTTPX logs full request URLs at INFO, which include the API key.
    logging.getLogger("httpx").setLevel(logging.WARNING)

    dry_run = not args.execute

    api_key = os.getenv("GNEWS_API_KEY", "")
    connection_string = os.getenv(
        "NEWS_POSTGRES_CONNECTION_STRING", ""
    )

    if not dry_run:
        if not api_key:
            raise RuntimeError("GNEWS_API_KEY is not configured")

        if not connection_string:
            raise RuntimeError(
                "NEWS_POSTGRES_CONNECTION_STRING is not configured"
            )

    repository = (
        GNewsArticleRepository(connection_string)
        if not dry_run
        else None
    )

    # Dry runs don't need a real API key because no requests
    # will be sent to GNews.
    with GNewsApiClient(
        api_key=api_key or "dry-run",
    ) as client:
        ingestion = GNewsIngestion(
            client=client,
            repository=repository,
        )

        result = ingestion.ingest(
            category=args.category,
            target_date=args.date,
            language=args.language,
            country=args.country,
            max_requests=args.max_requests,
            page_size=args.page_size,
            dry_run=dry_run,
        )

    print()
    print("INGESTION SUMMARY")
    print(f"Category:           {result.category}")
    print(f"Date:               {result.date}")
    print(f"Reported articles:  {result.total_reported}")
    print(f"Articles processed: {result.articles_processed}")
    print(f"Requests made:      {result.requests_made}")
    print(f"Complete:           {result.complete}")


if __name__ == "__main__":
    main()
