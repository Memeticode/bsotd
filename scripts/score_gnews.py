
import argparse
import logging
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Make the src/py packages importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "py"))

from news.embedding.text_embedder import TextEmbedder
from news.repository.gnews_article_similarity_repository import (
    GNewsArticleSimilarityRepository,
)
from news.similarity.gnews_article_similarity import (
    GNewsArticleSimilarity,
    MissingVectorsError,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Score the embedding and TF-IDF similarity of every pair of "
            "one day's GNews articles in PostgreSQL."
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
        "--embedding-model",
        default=TextEmbedder.DEFAULT_MODEL,
    )

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually score the pairs and write to PostgreSQL",
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

    similarity = GNewsArticleSimilarity(
        repository=GNewsArticleSimilarityRepository(connection_string),
        embedding_model=args.embedding_model,
    )

    try:
        result = similarity.score(
            category=args.category,
            published_date=args.date,
            dry_run=not args.execute,
        )
    except MissingVectorsError as error:
        sys.exit(str(error))

    print()
    print("SIMILARITY SUMMARY")
    print(f"Category:           {result.category}")
    print(f"Published date:     {result.published_date}")
    print(f"Articles scored:    {result.articles_found}")
    print(f"Pairs expected:     {result.pairs_expected}")
    print(f"Needs scoring:      {result.needs_scoring}")
    print(f"Pairs saved:        {result.pairs_saved}")


if __name__ == "__main__":
    main()
