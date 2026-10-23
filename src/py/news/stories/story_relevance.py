
from dataclasses import dataclass
from typing import Any

from news.stories.story import Story, format_articles


# Bump when the rubric changes meaning, so ratings record which they used.
CRITERIA_VERSION = "1"

# Enough of each article to judge it without paying for the full text.
CONTENT_CHARACTERS = 600

SYSTEM_PROMPT = """\
You rate news stories for BSOTD, a service that organizes the news into \
stories: each story is one event or development, covered by one or more \
articles. Your ratings decide which stories lead a category's daily feed \
and which get deeper analysis.

Rate each story on two separate scales.

Category relevance: how squarely the story belongs in the category it was \
filed under.
5 - Squarely in the category: it is the story's main subject.
4 - Clearly in the category, with a strong angle from another field.
3 - Partly in the category; reasonable to include.
2 - Mostly outside the category, with a tangential connection.
1 - Outside the category: filed there by mistake or as filler.

Importance: how significant the development is for a general audience, \
whatever its category.
5 - Major: broad, lasting consequences, or a landmark finding or event.
4 - Significant: real consequences or genuine novelty for many people.
3 - Moderate: of real interest, with limited consequences.
2 - Minor: routine updates, local service information or narrow interest.
1 - Trivial: promotion, filler, listicles or no news value.

Judge importance by the development itself, not by how sensational the \
headlines are or how many outlets ran it, including those listed as \
running the same text. Keep the scales independent: a \
major story can sit outside its category, and a story squarely in its \
category can be minor.

Also check that the articles report the same event or development. List \
any article that reports a different one in different_event_article_ids, \
and leave it empty when they agree or there is only one article.

In the rationale, explain both ratings in one or two sentences, based on \
what the articles report.\
"""

RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "category_relevance": {
            "type": "integer",
            "enum": [1, 2, 3, 4, 5],
        },
        "importance": {
            "type": "integer",
            "enum": [1, 2, 3, 4, 5],
        },
        "different_event_article_ids": {
            "type": "array",
            "items": {"type": "integer"},
        },
        "rationale": {"type": "string"},
    },
    "required": [
        "category_relevance",
        "importance",
        "different_event_article_ids",
        "rationale",
    ],
    "additionalProperties": False,
}

MAX_TOKENS = 1024


class InvalidRatingError(ValueError):
    pass


@dataclass(frozen=True)
class RelevanceRating:
    category_relevance: int
    importance: int
    different_event_article_ids: list[int]
    rationale: str


def build_prompt(story: Story) -> str:
    count = len(story.articles)

    return "\n".join([
        f"Category: {story.category}",
        f"Publication date: {story.published_date.isoformat()} (UTC)",
        f"Articles: {count}",
        "",
        format_articles(story.articles, CONTENT_CHARACTERS),
    ])


def parse_rating(data: dict[str, Any], story: Story) -> RelevanceRating:
    """Checks a response against the rubric and the story's articles."""
    scores = {}

    for field in ("category_relevance", "importance"):
        value = data.get(field)

        if not isinstance(value, int) or not 1 <= value <= 5:
            raise InvalidRatingError(f"{field} must be 1 to 5, not {value!r}")

        scores[field] = value

    rationale = data.get("rationale")

    if not isinstance(rationale, str) or not rationale.strip():
        raise InvalidRatingError("The rationale is empty")

    # Only the story's own articles can be flagged, and only when the
    # rest still form a story.
    article_ids = set(story.article_ids)
    flagged = sorted({
        article_id
        for article_id in data.get("different_event_article_ids") or []
        if article_id in article_ids
    })

    return RelevanceRating(
        category_relevance=scores["category_relevance"],
        importance=scores["importance"],
        different_event_article_ids=(
            flagged if len(flagged) < len(article_ids) else []
        ),
        rationale=rationale.strip(),
    )
