import {
  DatasetKind,
  PipelineJobStepKind,
  SortDirection,
  Status,
  type PipelineJob,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleDaily } from "./gnews-ingestion.ts";
import { vGnewsStory } from "./story-clustering.ts";

export const gnewsStoryRelevanceOverride: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_story_relevance_override",
  description:
    "Editors' category relevance and importance for a story, which take precedence over the model's.",
  editorial: true,
};

export const gnewsStoryRelevance: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_story_relevance",
  description:
    "Every rating the model has made: its scores, rationale and flagged articles, with the model's full response and token usage.",
};

export const vGnewsStoryRanked: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_story_ranked",
  description:
    "Stories with their effective ratings, ranked within each category and day.",
  sortBy: [
    { column: "published_date", direction: SortDirection.Descending },
    { column: "relevance_rank", direction: SortDirection.Ascending },
  ],
};

export const relevanceClassification: PipelineJob = {
  id: "relevance-classification",
  name: "Relevance classification",
  summary:
    "Rates each story's fit with its category and its importance with an LLM, then ranks each day's stories.",
  inputs: [vGnewsStory, vGnewsArticleDaily, gnewsStoryRelevanceOverride],
  steps: [
    {
      kind: PipelineJobStepKind.Llm,
      name: "Rate stories",
      description:
        "Claude (claude-opus-5-5 by default) reads each story's articles, their titles, descriptions and opening text, and rates it on two 1–5 scales: category relevance, how squarely it belongs in its category, and importance, how significant it is for a general audience. It also flags any article that reports a different event from the rest of its story. A story is rated again only when its articles, the model or the rubric change.",
      status: Status.Implemented,
      implementedIn: [
        "scripts/rate_gnews.py",
        "src/py/news/stories/gnews_story_relevance.py",
        "src/py/news/stories/story_relevance.py",
        "src/py/news/stories/story.py",
        "src/py/news/clients/claude_client.py",
        "src/py/news/repository/gnews_story_relevance_repository.py",
        "src/py/news/repository/gnews_story_reader.py",
      ],
      produces: [gnewsStoryRelevance],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Rank stories",
      description:
        "Takes each story's latest rating, lets editors' ratings take precedence, and ranks each day's stories: those that fit the category (relevance 3 or more) first, then by importance. rating_is_current is false when the story's articles have changed since it was rated.",
      status: Status.Implemented,
      produces: [vGnewsStoryRanked],
    },
  ],
  notes: [
    "Category relevance and importance are kept separate: fit decides whether a story belongs in its category's feed, and importance its place there.",
    "Rating stories rather than articles avoids rating the same story repeatedly.",
    "Every rating is kept with its model, rubric version and articles, and with the model's full response.",
    "Editors can override both scores from the story page; the model's ratings are kept alongside.",
  ],
};
