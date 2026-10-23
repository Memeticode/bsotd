
import argparse
import logging
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Make the src/py packages importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "py"))

from news.repository.gnews_article_tfidf_repository import (
    GNewsArticleTfidfRepository,
)
from news.repository.gnews_daily_article_repository import (
    GNewsDailyArticleRepository,
)
from news.tfidf.gnews_article_tfidf import GNewsArticleTfidf


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Fit a TF-IDF corpus on one day's GNews articles (title, "
            "description and the opening of their content), and store each "
            "article's vector in PostgreSQL."
        )
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
        help="UTC publication date: YYYY-MM-DD",
    )

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually fit the corpus and write to PostgreSQL",
    )

    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    connection_string = os.getenv(
        "NEWS_POSTGRES_CONNECTION_STRING", ""
    )

    # Dry runs still read from PostgreSQL to report pending work.
    if not connection_string:
        raise RuntimeError(
            "NEWS_POSTGRES_CONNECTION_STRING is not configured"
        )

    tfidf = GNewsArticleTfidf(
        articles=GNewsDailyArticleRepository(connection_string),
        repository=GNewsArticleTfidfRepository(connection_string),
    )

    result = tfidf.vectorize(
        category=args.category,
        published_date=args.date,
        dry_run=not args.execute,
    )

    print()
    print("TF-IDF SUMMARY")
    print(f"Category:           {result.category}")
    print(f"Published date:     {result.published_date}")
    print(f"Articles found:     {result.articles_found}")
    print(f"Needs fitting:      {result.needs_fitting}")
    print(f"Vectors saved:      {result.vectors_saved}")


if __name__ == "__main__":
    main()
