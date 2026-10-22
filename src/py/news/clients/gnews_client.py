
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

import httpx


@dataclass(frozen=True)
class GNewsRequest:
    category: str
    date: date
    language: str = "en"
    country: str = "us"
    page: int = 1
    max_articles: int = 10

    def __post_init__(self) -> None:
        if not 1 <= self.max_articles <= 10:
            raise ValueError("max_articles must be between 1 and 10")

        if self.page < 1:
            raise ValueError("page must be positive")

    @property
    def date_range(self) -> tuple[datetime, datetime]:
        start = datetime.combine(
            self.date,
            time.min,
            tzinfo=timezone.utc,
        )
        end = start + timedelta(days=1, seconds=-1)
        return start, end

    def to_params(self) -> dict[str, str | int]:
        start, end = self.date_range

        def format_date(value: datetime) -> str:
            return value.strftime("%Y-%m-%dT%H:%M:%SZ")

        return {
            "category": self.category,
            "lang": self.language,
            "country": self.country,
            "max": self.max_articles,
            "page": self.page,
            "from": format_date(start),
            "to": format_date(end),
        }


@dataclass
class GNewsResponse:
    total_articles: int
    articles: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_json(cls, data: dict[str, Any]) -> "GNewsResponse":
        total = data["totalArticles"]
        articles = data["articles"]

        if (
            not isinstance(total, int)
            or total < 0
            or not isinstance(articles, list)
            or not all(isinstance(a, dict) for a in articles)
        ):
            raise ValueError("Invalid GNews API response")

        return cls(
            total_articles=total,
            articles=articles,
        )


class GNewsApiError(Exception):
    pass


class GNewsApiClient:
    BASE_URL = "https://gnews.io/api/v4/top-headlines"

    def __init__(
        self,
        api_key: str,
        timeout: float = 30.0,
    ) -> None:
        if not api_key:
            raise ValueError("GNews API key is required")

        self._api_key = api_key
        self._client = httpx.Client(timeout=timeout)

    def get_top_headlines(
        self,
        request: GNewsRequest,
    ) -> GNewsResponse:
        params = request.to_params()
        params["apikey"] = self._api_key

        response = self._client.get(
            self.BASE_URL,
            params=params,
        )

        # httpx error messages include the request URL, which
        # contains the API key, so re-raise without it.
        if response.is_error:
            raise GNewsApiError(
                f"GNews request failed with HTTP {response.status_code}: "
                f"{response.text[:500]}"
            )

        return GNewsResponse.from_json(response.json())

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "GNewsApiClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
