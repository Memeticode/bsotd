
from datetime import date, datetime, timezone
from typing import Any

from news.clients.claude_client import ClaudeError, StructuredResponse
from news.stories.story import Story, StoryArticle


def article(article_id: int, source_name: str = "Outlet", **fields: Any) -> StoryArticle:
    values: dict[str, Any] = {
        "id": article_id,
        "source_name": source_name,
        "carried_by": (source_name,),
        "published_at": datetime(2026, 10, 21, 9, 55, tzinfo=timezone.utc),
        "title": f"Title {article_id}",
        "description": f"Description {article_id}",
        "content": f"Content {article_id}",
    }
    values.update(fields)
    return StoryArticle(**values)


def story(story_id: int, *articles: StoryArticle) -> Story:
    return Story(
        id=story_id,
        category="science",
        published_date=date(2026, 10, 21),
        articles=articles,
    )


class FakeLlm:
    """Answers with queued responses, or raises queued errors."""

    def __init__(self, model: str, *answers: dict[str, Any] | Exception) -> None:
        self._model = model
        self._answers = list(answers)
        self.prompts: list[str] = []

    @property
    def model(self) -> str:
        return self._model

    def complete(
        self,
        system: str,
        prompt: str,
        schema: dict[str, Any],
        max_tokens: int,
    ) -> StructuredResponse:
        self.prompts.append(prompt)
        answer = self._answers.pop(0)

        if isinstance(answer, Exception):
            raise answer

        return StructuredResponse(data=answer, input_tokens=100, output_tokens=10)


__all__ = ["ClaudeError", "FakeLlm", "article", "story"]
