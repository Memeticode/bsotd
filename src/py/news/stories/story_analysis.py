
from dataclasses import dataclass, field
from typing import Any

from news.stories.story import Story, format_articles


# Bump when the instructions change meaning, so analyses record which
# they followed.
PROMPT_VERSION = "1"

# Long enough for most articles in full.
CONTENT_CHARACTERS = 6000

MAX_CLAIMS = 12

SYSTEM_PROMPT = f"""\
You analyze news stories for BSOTD, a service that organizes the news into \
stories: each story is one event or development, covered by one or more \
articles. Readers want to understand what happened, what the sources agree \
on, where they differ, and what each source adds.

Work only from the articles provided. Never add facts from elsewhere, and \
never guess at an outlet's motives. An article's "Same text also run by" \
line lists other outlets that published it word for word; it comes from \
our records, not from the article.

headline: a neutral, specific headline for the story, under 15 words.

summary: two or three neutral sentences on what happened, using only what \
the articles report.

takeaways: two to four short points a reader should leave with, each \
backed by the claims.

claims: the distinct, checkable claims the articles make about the story: \
who did what, when and where, and with what numbers, findings or \
consequences. Write each as one self-contained sentence, and give at most \
{MAX_CLAIMS}, preferring those that matter most. Mark a claim "fact" when \
it reports what happened or was found, and "interpretation" when it is \
analysis, prediction or opinion, including opinions an article attributes \
to someone. For each claim, list every article that addresses it: \
"supports" when the article reports it, "contradicts" when the article \
reports something incompatible with it. Give each a brief quote of the \
article's own words as evidence. Leave out articles that don't mention the \
claim: not mentioning a claim is not contradicting it.

syndicated_copies: groups of two or more articles that reproduce the same \
underlying report, such as wire copy run by several outlets, so they \
aren't counted as independent confirmation. Leave it empty when every \
article is independent.

framing: for each article, one neutral sentence on its angle and emphasis: \
what it leads with, and what it foregrounds or leaves out compared with \
the others. Describe; don't judge.\
"""

ARTICLE_ID: dict[str, Any] = {"type": "integer"}

RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "summary": {"type": "string"},
        "takeaways": {"type": "array", "items": {"type": "string"}},
        "claims": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "statement": {"type": "string"},
                    "kind": {
                        "type": "string",
                        "enum": ["fact", "interpretation"],
                    },
                    "sources": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "article_id": ARTICLE_ID,
                                "stance": {
                                    "type": "string",
                                    "enum": ["supports", "contradicts"],
                                },
                                "evidence": {"type": "string"},
                            },
                            "required": ["article_id", "stance", "evidence"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["statement", "kind", "sources"],
                "additionalProperties": False,
            },
        },
        "syndicated_copies": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "article_ids": {"type": "array", "items": ARTICLE_ID},
                    "basis": {"type": "string"},
                },
                "required": ["article_ids", "basis"],
                "additionalProperties": False,
            },
        },
        "framing": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "article_id": ARTICLE_ID,
                    "framing": {"type": "string"},
                },
                "required": ["article_id", "framing"],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "headline",
        "summary",
        "takeaways",
        "claims",
        "syndicated_copies",
        "framing",
    ],
    "additionalProperties": False,
}

MAX_TOKENS = 8192


class InvalidAnalysisError(ValueError):
    pass


@dataclass
class CheckedAnalysis:
    analysis: dict[str, Any]
    # What was dropped because it didn't match the story's articles.
    problems: list[str] = field(default_factory=list)


def build_prompt(story: Story) -> str:
    return "\n".join([
        f"Category: {story.category}",
        f"Publication date: {story.published_date.isoformat()} (UTC)",
        f"Articles: {len(story.articles)}",
        "",
        format_articles(story.articles, CONTENT_CHARACTERS),
    ])


def check_analysis(data: dict[str, Any], story: Story) -> CheckedAnalysis:
    """Keeps only what refers to the story's own articles.

    Sources, copies and framing that cite other article IDs are dropped,
    an article counts once per claim, and claims left without sources
    are dropped. A response without a headline, summary or any claim is
    rejected.
    """
    article_ids = set(story.article_ids)
    problems: list[str] = []

    headline = _text(data.get("headline"))
    summary = _text(data.get("summary"))

    if not headline or not summary:
        raise InvalidAnalysisError("The headline or summary is empty")

    claims = []

    for number, claim in enumerate(data.get("claims") or [], start=1):
        statement = _text(claim.get("statement"))
        kind = claim.get("kind")
        sources = []
        cited: set[int] = set()

        for source in claim.get("sources") or []:
            article_id = source.get("article_id")

            if article_id not in article_ids:
                problems.append(f"claim {number} cites unknown article {article_id}")
            elif article_id in cited:
                problems.append(f"claim {number} cites article {article_id} twice")
            elif source.get("stance") in ("supports", "contradicts"):
                cited.add(article_id)
                sources.append({
                    "article_id": article_id,
                    "stance": source["stance"],
                    "evidence": _text(source.get("evidence")),
                })

        if statement and kind in ("fact", "interpretation") and sources:
            claims.append({"statement": statement, "kind": kind, "sources": sources})
        else:
            problems.append(f"claim {number} dropped")

    if not claims:
        raise InvalidAnalysisError("No claim cites the story's articles")

    # Each article belongs to at most one group of copies.
    grouped: set[int] = set()
    syndicated_copies = []

    for group in data.get("syndicated_copies") or []:
        copies = sorted(
            {
                article_id for article_id in group.get("article_ids") or []
                if article_id in article_ids
            }
            - grouped
        )

        if len(copies) >= 2:
            grouped.update(copies)
            syndicated_copies.append(
                {"article_ids": copies, "basis": _text(group.get("basis"))}
            )

    framing = []
    framed: set[int] = set()

    for note in data.get("framing") or []:
        article_id = note.get("article_id")
        text = _text(note.get("framing"))

        if article_id in article_ids and article_id not in framed and text:
            framed.add(article_id)
            framing.append({"article_id": article_id, "framing": text})

    return CheckedAnalysis(
        analysis={
            "headline": headline,
            "summary": summary,
            "takeaways": [
                text
                for takeaway in data.get("takeaways") or []
                if (text := _text(takeaway))
            ],
            "claims": claims,
            "syndicated_copies": syndicated_copies,
            "framing": sorted(framing, key=lambda note: note["article_id"]),
        },
        problems=problems,
    )


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""
