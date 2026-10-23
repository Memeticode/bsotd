
import logging
from dataclasses import dataclass
from datetime import date

from news.clients.claude_client import ClaudeError, StructuredLlm
from news.repository.gnews_story_analysis_repository import (
    GNewsStoryAnalysisRepository,
    StoryAnalysis,
)
from news.stories.story import hash_prompt
from news.stories.story_analysis import (
    MAX_TOKENS,
    PROMPT_VERSION,
    RESPONSE_SCHEMA,
    SYSTEM_PROMPT,
    InvalidAnalysisError,
    build_prompt,
    check_analysis,
)


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AnalysisResult:
    category: str
    published_date: date
    model: str
    stories_selected: int
    already_analyzed: int
    analyses_saved: int
    analyses_failed: int
    input_tokens: int
    output_tokens: int


class GNewsStoryAnalysis:
    def __init__(
        self,
        repository: GNewsStoryAnalysisRepository,
        llm: StructuredLlm | None,
        model: str,
        min_importance: int = 2,
        limit: int = 5,
    ) -> None:
        if llm is not None and llm.model != model:
            raise ValueError("LLM model does not match model")

        if not 1 <= min_importance <= 5:
            raise ValueError("min_importance must be between 1 and 5")

        if limit < 1:
            raise ValueError("limit must be positive")

        self._repository = repository
        self._llm = llm
        self._model = model
        self._min_importance = min_importance
        self._limit = limit

    def analyze(
        self,
        category: str,
        published_date: date,
        dry_run: bool = True,
    ) -> AnalysisResult:
        if not dry_run and self._llm is None:
            raise ValueError("An LLM is required for live analysis")

        # Only stories that fit their category and matter enough, by
        # their editors' or else the model's ratings.
        stories = self._repository.get_relevant_stories(
            category, published_date, self._min_importance, self._limit
        )
        analyzed = self._repository.get_input_hashes(
            [story.id for story in stories], self._model, PROMPT_VERSION
        )

        pending = []

        for story in stories:
            prompt = build_prompt(story)
            input_hash = hash_prompt(
                self._model, PROMPT_VERSION, SYSTEM_PROMPT, prompt
            )

            if input_hash not in analyzed.get(story.id, ()):
                pending.append((story, prompt, input_hash))

        logger.info(
            "%d stories selected, %d already analyzed, %d pending",
            len(stories),
            len(stories) - len(pending),
            len(pending),
        )

        saved = failed = input_tokens = output_tokens = 0

        if dry_run:
            logger.info("[DRY RUN] No stories analyzed")
        else:
            assert self._llm is not None

            for story, prompt, input_hash in pending:
                try:
                    response = self._llm.complete(
                        SYSTEM_PROMPT, prompt, RESPONSE_SCHEMA, MAX_TOKENS
                    )
                    checked = check_analysis(response.data, story)
                except (ClaudeError, InvalidAnalysisError) as error:
                    # One story's bad answer shouldn't stop the others.
                    logger.error("Story %d not analyzed: %s", story.id, error)
                    failed += 1
                    continue

                for problem in checked.problems:
                    logger.warning("Story %d: %s", story.id, problem)

                self._repository.save_analysis(StoryAnalysis(
                    story_id=story.id,
                    model=self._model,
                    prompt_version=PROMPT_VERSION,
                    article_ids=story.article_ids,
                    input_hash=input_hash,
                    response=response.data,
                    analysis=checked.analysis,
                    input_tokens=response.input_tokens,
                    output_tokens=response.output_tokens,
                ))

                saved += 1
                input_tokens += response.input_tokens
                output_tokens += response.output_tokens

                logger.info(
                    "Story %d: %d claims",
                    story.id,
                    len(checked.analysis["claims"]),
                )

        return AnalysisResult(
            category=category,
            published_date=published_date,
            model=self._model,
            stories_selected=len(stories),
            already_analyzed=len(stories) - len(pending),
            analyses_saved=saved,
            analyses_failed=failed,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
