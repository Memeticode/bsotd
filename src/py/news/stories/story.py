
import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class StoryArticle:
    id: int
    source_name: str | None
    # Outlets that ran this article word for word, its own included.
    carried_by: tuple[str, ...]
    published_at: datetime | None
    title: str | None
    description: str | None
    content: str | None


@dataclass(frozen=True)
class Story:
    id: int
    category: str
    published_date: date
    # In ID order.
    articles: tuple[StoryArticle, ...]

    @property
    def article_ids(self) -> list[int]:
        return [article.id for article in self.articles]


def format_articles(
    articles: Sequence[StoryArticle],
    content_characters: int,
) -> str:
    """Articles as tagged blocks for a prompt, each with up to
    `content_characters` of its content."""
    blocks = []

    for article in articles:
        others = [
            outlet for outlet in article.carried_by
            if outlet != article.source_name
        ]

        published = (
            article.published_at.strftime("%Y-%m-%d %H:%M UTC")
            if article.published_at
            else "unknown"
        )

        lines = [
            f'<article id="{article.id}">',
            f"Outlet: {article.source_name or 'unknown'}",
        ]

        # From deduplication, not from the article itself.
        if others:
            lines.append(f"Same text also run by: {', '.join(others)}")

        lines += [
            f"Published: {published}",
            f"Title: {(article.title or '').strip()}",
            f"Description: {(article.description or '').strip()}",
        ]

        content = (article.content or "").strip()

        if content and content_characters > 0:
            if len(content) > content_characters:
                content = content[:content_characters].rstrip() + " […]"

            lines += ["Content:", content]

        lines.append("</article>")
        blocks.append("\n".join(lines))

    return "\n\n".join(blocks)


def hash_prompt(*parts: str) -> str:
    """Identifies everything sent to a model, so outputs are only
    regenerated when it changes."""
    digest = hashlib.sha256()

    for part in parts:
        digest.update(part.encode("utf-8"))
        digest.update(b"\x00")

    return digest.hexdigest()
