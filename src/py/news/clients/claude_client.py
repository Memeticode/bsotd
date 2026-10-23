
import json
from dataclasses import dataclass
from typing import Any, Protocol

import anthropic


class ClaudeError(Exception):
    pass


@dataclass(frozen=True)
class StructuredResponse:
    data: dict[str, Any]
    input_tokens: int
    output_tokens: int


class StructuredLlm(Protocol):
    """What the LLM jobs need from a model: JSON matching a schema."""

    @property
    def model(self) -> str: ...

    def complete(
        self,
        system: str,
        prompt: str,
        schema: dict[str, Any],
        max_tokens: int,
    ) -> StructuredResponse: ...


class ClaudeClient:
    """Asks Claude for JSON that matches a schema, using structured outputs."""

    DEFAULT_MODEL = "claude-opus-5-5"

    def __init__(
        self,
        api_key: str,
        model: str,
        max_retries: int = 4,
        timeout: float = 300.0,
    ) -> None:
        if not api_key:
            raise ValueError("Anthropic API key is required")

        # The SDK retries rate limits, overloads and connection errors.
        self._client = anthropic.Anthropic(
            api_key=api_key,
            max_retries=max_retries,
            timeout=timeout,
        )
        self._model = model

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
        message = self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            output_config={
                "format": {"type": "json_schema", "schema": schema},
            },
        )

        # Anything else, such as running out of tokens, leaves the JSON
        # incomplete.
        if message.stop_reason != "end_turn":
            raise ClaudeError(
                f"Claude stopped early ({message.stop_reason})"
            )

        text = "".join(
            block.text for block in message.content if block.type == "text"
        )

        try:
            data = json.loads(text)
        except json.JSONDecodeError as error:
            raise ClaudeError(f"Claude's answer isn't JSON: {error}") from error

        return StructuredResponse(
            data=data,
            input_tokens=message.usage.input_tokens,
            output_tokens=message.usage.output_tokens,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "ClaudeClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
