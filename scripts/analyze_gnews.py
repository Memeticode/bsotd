
import argparse
import logging
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Make the src/py packages importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "py"))

from news.clients.claude_client import ClaudeClient
from news.repository.gnews_story_analysis_repository import (
    GNewsStoryAnalysisRepository,
)
from news.stories.gnews_story_analysis import GNewsStoryAnalysis


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extract claims from one day's most relevant GNews stories and "
            "compare their sources with Claude."
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
        default=ClaudeClient.DEFAULT_MODEL,
    )

    parser.add_argument(
        "--min-importance",
        type=int,
        default=2,
        help="Lowest importance, 1 to 5, to analyze (default: 2)",
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=5,
        help="Most stories to analyze, highest-ranked first (default: 5)",
    )

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually call Claude and write to PostgreSQL",
    )

    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    # The SDK's HTTP client logs each request at INFO.
    logging.getLogger("httpx2").setLevel(logging.WARNING)

    dry_run = not args.execute

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    connection_string = os.getenv(
        "NEWS_POSTGRES_CONNECTION_STRING", ""
    )

    # Dry runs still read from PostgreSQL to report pending work.
    if not connection_string:
        raise RuntimeError(
            "NEWS_POSTGRES_CONNECTION_STRING is not configured"
        )

    if not dry_run and not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    # Dry runs don't call Claude, so they don't need a key.
    llm = ClaudeClient(api_key=api_key, model=args.model) if not dry_run else None

    analysis = GNewsStoryAnalysis(
        repository=GNewsStoryAnalysisRepository(connection_string),
        llm=llm,
        model=args.model,
        min_importance=args.min_importance,
        limit=args.limit,
    )

    try:
        result = analysis.analyze(
            category=args.category,
            published_date=args.date,
            dry_run=dry_run,
        )
    finally:
        if llm is not None:
            llm.close()

    print()
    print("ANALYSIS SUMMARY")
    print(f"Category:           {result.category}")
    print(f"Published date:     {result.published_date}")
    print(f"Model:              {result.model}")
    print(f"Stories selected:   {result.stories_selected}")
    print(f"Already analyzed:   {result.already_analyzed}")
    print(f"Analyses saved:     {result.analyses_saved}")
    print(f"Analyses failed:    {result.analyses_failed}")
    print(f"Tokens used:        {result.input_tokens} in, {result.output_tokens} out")


if __name__ == "__main__":
    main()
