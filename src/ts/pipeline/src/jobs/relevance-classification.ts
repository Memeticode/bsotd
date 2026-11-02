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
    "Editors' verdicts on whether a story is relevant, which take precedence over the model's ratings.",
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
    "Stories with their ratings, sorted into relevant or not and ranked within each category and day.",
  sortBy: [
    { column: "published_date", direction: SortDirection.Descending },
    { column: "relevance_rank", direction: SortDirection.Ascending },
  ],
};

export const relevanceClassification: PipelineJob = {
  id: "relevance-classification",
  name: "Relevance classification",
  summary:
    "Rates each story's fit with its category and its importance with an LLM, then sorts each day's stories into relevant or not and ranks them.",
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
      name: "Sort and rank stories",
      description:
        "Takes each story's latest rating and decides whether it's relevant: in its category and of moderate importance or more, 3 or more on both scales. An editor's verdict takes precedence. Relevant stories rank first, then the rest, each by importance. rating_is_current is false when the story's articles have changed since it was rated.",
      status: Status.Implemented,
      produces: [vGnewsStoryRanked],
    },
  ],
  notes: [
    "The model rates on two scales, but readers see two groups: relevant stories, and the rest. Minor and trivial stories, and those outside the category, aren't relevant. The scales still order the stories within each group.",
    "Rating stories rather than articles avoids rating the same story repeatedly.",
    "Every rating is kept with its model, rubric version and articles, and with the model's full response.",
    "Editors can mark a story relevant or not from the story page; the model's ratings are kept alongside and still set its place.",
  ],
};
