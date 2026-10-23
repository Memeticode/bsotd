
import argparse
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parent

# The jobs after ingestion, in pipeline order: each reads what the ones
# before it write.
JOBS = [
    "embed_gnews.py",
    "vectorize_gnews.py",
    "score_gnews.py",
    "cluster_gnews.py",
    "rate_gnews.py",
    "analyze_gnews.py",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run every job for one category and day, in pipeline order, "
            "by calling each job's script."
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
        help="UTC date: YYYY-MM-DD",
    )

    parser.add_argument(
        "--ingest",
        action="store_true",
        help="Fetch the day's headlines from GNews first (uses API quota)",
    )

    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually run the jobs and write to PostgreSQL",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    jobs = (["ingest_gnews.py"] if args.ingest else []) + JOBS

    common = ["--category", args.category, "--date", args.date.isoformat()]

    if args.execute:
        common.append("--execute")

    for job in jobs:
        print(f"\n=== {job}", flush=True)

        completed = subprocess.run([sys.executable, str(SCRIPTS / job), *common])

        # A job whose inputs aren't ready stops the run. In a dry run that
        # is expected: earlier jobs only reported what they would write.
        if completed.returncode != 0:
            if not args.execute:
                print(
                    "\nStopped: this job's inputs aren't ready, which is "
                    "expected in a dry run when earlier jobs have work to do."
                )
            sys.exit(completed.returncode)


if __name__ == "__main__":
    main()
