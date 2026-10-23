
import argparse
import logging
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Make the src/py packages importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "py"))

from news.repository.gnews_daily_article_repository import (
    GNewsDailyArticleRepository,
)
from news.repository.gnews_story_repository import GNewsStoryRepository
from news.stories.gnews_story_clustering import (
    GNewsStoryClustering,
    MissingSimilarityError,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Group one day's GNews articles into stories by their pair "
            "similarities, reapplying editors' corrections."
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
        help="Actually save the stories to PostgreSQL",
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

    clustering = GNewsStoryClustering(
        articles=GNewsDailyArticleRepository(connection_string),
        repository=GNewsStoryRepository(connection_string),
    )

    try:
        result = clustering.cluster(
            category=args.category,
            published_date=args.date,
            dry_run=not args.execute,
        )
    except MissingSimilarityError as error:
        sys.exit(str(error))

    print()
    print("CLUSTERING SUMMARY")
    print(f"Category:           {result.category}")
    print(f"Published date:     {result.published_date}")
    print(f"Articles found:     {result.articles_found}")
    print(f"Stories:            {result.stories}")
    print(f"Placed by editors:  {result.editor_placed}")
    print(f"Stories created:    {result.stories_created}")
    print(f"Stories updated:    {result.stories_updated}")
    print(f"Stories unchanged:  {result.stories_unchanged}")
    print(f"Stories removed:    {result.stories_removed}")


if __name__ == "__main__":
    main()
