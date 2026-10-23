
import logging
from dataclasses import dataclass
from datetime import date

from news.clients.claude_client import ClaudeError, StructuredLlm
from news.repository.gnews_story_relevance_repository import (
    GNewsStoryRelevanceRepository,
    StoryRating,
)
from news.stories.story import hash_prompt
from news.stories.story_relevance import (
    CRITERIA_VERSION,
    MAX_TOKENS,
    RESPONSE_SCHEMA,
    SYSTEM_PROMPT,
    InvalidRatingError,
    build_prompt,
    parse_rating,
)


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RelevanceResult:
    category: str
    published_date: date
    model: str
    stories_found: int
    already_rated: int
    ratings_saved: int
    ratings_failed: int
    input_tokens: int
    output_tokens: int


class GNewsStoryRelevance:
    def __init__(
        self,
        repository: GNewsStoryRelevanceRepository,
        llm: StructuredLlm | None,
        model: str,
    ) -> None:
        if llm is not None and llm.model != model:
            raise ValueError("LLM model does not match model")

        self._repository = repository
        self._llm = llm
        self._model = model

    def rate(
        self,
        category: str,
        published_date: date,
        dry_run: bool = True,
    ) -> RelevanceResult:
        if not dry_run and self._llm is None:
            raise ValueError("An LLM is required for live rating")

        stories = self._repository.get_stories(category, published_date)
        rated = self._repository.get_input_hashes(
            [story.id for story in stories], self._model, CRITERIA_VERSION
        )

        # A story needs a rating when its current articles haven't been
        # rated with this model and rubric.
        pending = []

        for story in stories:
            prompt = build_prompt(story)
            input_hash = hash_prompt(
                self._model, CRITERIA_VERSION, SYSTEM_PROMPT, prompt
            )

            if input_hash not in rated.get(story.id, ()):
                pending.append((story, prompt, input_hash))

        logger.info(
            "%d stories found, %d already rated, %d pending",
            len(stories),
            len(stories) - len(pending),
            len(pending),
        )

        saved = failed = input_tokens = output_tokens = 0

        if dry_run:
            logger.info("[DRY RUN] No stories rated")
        else:
            assert self._llm is not None

            for story, prompt, input_hash in pending:
                try:
                    response = self._llm.complete(
                        SYSTEM_PROMPT, prompt, RESPONSE_SCHEMA, MAX_TOKENS
                    )
                    rating = parse_rating(response.data, story)
                except (ClaudeError, InvalidRatingError) as error:
                    # One story's bad answer shouldn't stop the others.
                    logger.error("Story %d not rated: %s", story.id, error)
                    failed += 1
                    continue

                self._repository.save_rating(StoryRating(
                    story_id=story.id,
                    model=self._model,
                    criteria_version=CRITERIA_VERSION,
                    article_ids=story.article_ids,
                    input_hash=input_hash,
                    category_relevance=rating.category_relevance,
                    importance=rating.importance,
                    rationale=rating.rationale,
                    different_event_article_ids=rating.different_event_article_ids,
                    response=response.data,
                    input_tokens=response.input_tokens,
                    output_tokens=response.output_tokens,
                ))

                saved += 1
                input_tokens += response.input_tokens
                output_tokens += response.output_tokens

                logger.info(
                    "Story %d: category relevance %d, importance %d",
                    story.id,
                    rating.category_relevance,
                    rating.importance,
                )

        return RelevanceResult(
            category=category,
            published_date=published_date,
            model=self._model,
            stories_found=len(stories),
            already_rated=len(stories) - len(pending),
            ratings_saved=saved,
            ratings_failed=failed,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
