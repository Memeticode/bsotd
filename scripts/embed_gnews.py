
import argparse
import logging
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Make the src/py packages importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "py"))

from news.embedding.gnews_article_embedding import GNewsArticleEmbedding
from news.embedding.text_embedder import TextEmbedder
from news.repository.gnews_article_embedding_repository import (
    GNewsArticleEmbeddingRepository,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Embed deduplicated GNews article titles and "
            "descriptions into PostgreSQL."
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
        "--model",
        default=TextEmbedder.DEFAULT_MODEL,
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=64,
    )

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually generate embeddings and write to PostgreSQL",
    )

    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    dry_run = not args.execute

    connection_string = os.getenv(
        "NEWS_POSTGRES_CONNECTION_STRING", ""
    )

    # Dry runs still read from PostgreSQL to report pending work.
    if not connection_string:
        raise RuntimeError(
            "NEWS_POSTGRES_CONNECTION_STRING is not configured"
        )

    repository = GNewsArticleEmbeddingRepository(connection_string)

    # Loading the model is slow, so dry runs skip it.
    embedder = (
        TextEmbedder(model=args.model, batch_size=args.batch_size)
        if not dry_run
        else None
    )

    embedding = GNewsArticleEmbedding(
        repository=repository,
        embedder=embedder,
        model=args.model,
        batch_size=args.batch_size,
    )

    result = embedding.embed(
        category=args.category,
        published_date=args.date,
        dry_run=dry_run,
    )

    print()
    print("EMBEDDING SUMMARY")
    print(f"Category:           {result.category}")
    print(f"Published date:     {result.published_date}")
    print(f"Model:              {result.model}")
    print(f"Articles found:     {result.articles_found}")
    print(f"Already embedded:   {result.already_embedded}")
    print(f"Embeddings saved:   {result.embeddings_saved}")


if __name__ == "__main__":
    main()
