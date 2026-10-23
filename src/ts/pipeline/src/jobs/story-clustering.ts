import {
  DatasetKind,
  PipelineJobStepKind,
  SortDirection,
  Status,
  type PipelineJob,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleDailySimilarity } from "./daily-pair-similarity.ts";
import { vGnewsArticleDaily } from "./gnews-ingestion.ts";

export const gnewsStoryArticleOverride: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_story_article_override",
  description:
    "Editors' corrections to story assignments: the article to share a story with, or none for a story of its own.",
  editorial: true,
};

export const gnewsStory: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_story",
  description:
    "One row per story: its category and day, and the clustering method, settings and cohesion that formed it.",
};

export const gnewsStoryArticle: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_story_article",
  description:
    "Which story each article belongs to, and whether the model or an editor placed it there.",
};

export const vGnewsStory: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_story",
  description:
    "One row per story with its articles, its outlets and its lead article.",
  sortBy: [
    { column: "published_date", direction: SortDirection.Descending },
    { column: "article_count", direction: SortDirection.Descending },
    { column: "id", direction: SortDirection.Ascending },
  ],
};

export const storyClustering: PipelineJob = {
  id: "story-clustering",
  name: "Story clustering",
  summary:
    "Groups articles covering the same event or development within one UTC publication day.",
  inputs: [
    vGnewsArticleDaily,
    vGnewsArticleDailySimilarity,
    gnewsStoryArticleOverride,
  ],
  steps: [
    {
      kind: PipelineJobStepKind.Model,
      name: "Cluster articles into stories",
      description:
        "Mixes each pair's similarities (0.6 × embedding + 0.4 × TF-IDF) and groups the day's articles by average-linkage agglomerative clustering, merging groups while their average similarity is above 0.475. Editors' corrections are then replayed in the order they were made. A group continues the existing story it shares most of its articles with, so stories keep their IDs, ratings and analyses as articles join or move; the rest become new stories.",
      status: Status.Implemented,
      implementedIn: [
        "scripts/cluster_gnews.py",
        "src/py/news/stories/gnews_story_clustering.py",
        "src/py/news/stories/story_clustering.py",
        "src/py/news/repository/gnews_story_repository.py",
        "src/py/news/repository/gnews_daily_article_repository.py",
      ],
      produces: [gnewsStory, gnewsStoryArticle],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Summarize stories",
      description:
        "One row per story: its article count and IDs, every outlet carrying it (syndicated copies included), and its lead article, the one carried by the most outlets, then the earliest. edited is true when an editor placed any of its articles.",
      status: Status.Implemented,
      produces: [vGnewsStory],
    },
  ],
  notes: [
    "The settings were calibrated on seven days of science articles: same-story pairs scored 0.49 to 0.92, and pairs from different stories on related topics up to 0.45. Every threshold from 0.45 to 0.50 grouped them the same way; 0.475 sits in the middle.",
    "Similar topics must not pass as one story. Two reports of different SpaceX launches scored 0.56 to 0.58, which no threshold separates, so relevance classification flags articles that report a different event from the rest of their story.",
    "Clustering works within one UTC publication day; persistent stories across days are a future extension.",
    "Editors can move an article to another story or split it out from the story page. Corrections apply at once and are replayed whenever the day is clustered again.",
  ],
};
