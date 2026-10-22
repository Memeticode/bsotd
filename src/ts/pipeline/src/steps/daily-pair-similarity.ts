import {
  ColumnType,
  DatasetKind,
  SortDirection,
  Status,
  StepKind,
  type PipelineStep,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleTitleAndDescriptionEmbedded } from "./sentence-embeddings.ts";
import { vGnewsArticleTitleAndDescriptionTfidf } from "./tfidf-vectors.ts";

export const gnewsArticleDailySimilarity: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_daily_similarity",
  description:
    "Embedding and TF-IDF cosine similarity for every unordered pair of articles in a category and UTC publication date.",
  columns: [
    { name: "category" },
    { name: "published_date", type: ColumnType.Date },
    { name: "article_a_id" },
    { name: "article_b_id" },
    { name: "embedding_cosine_similarity", type: ColumnType.Number },
    { name: "tfidf_cosine_similarity", type: ColumnType.Number },
    { name: "calculated_at", type: ColumnType.Timestamp },
  ],
  sortBy: [
    { column: "published_date", direction: SortDirection.Descending },
    {
      column: "embedding_cosine_similarity",
      direction: SortDirection.Descending,
    },
  ],
};

export const dailyPairSimilarity: PipelineStep = {
  id: "daily-pair-similarity",
  kind: StepKind.Sql,
  name: "Daily pair similarity",
  summary:
    "Scores every pair of articles in a category and day by embedding and TF-IDF similarity.",
  inputs: [
    vGnewsArticleTitleAndDescriptionEmbedded,
    vGnewsArticleTitleAndDescriptionTfidf,
  ],
  transformations: [
    {
      name: "Match daily article sets",
      description:
        "Selects the same articles from the embedding and TF-IDF views for one category and UTC publication date.",
      status: Status.Todo,
    },
    {
      name: "Score article pairs",
      description:
        "Compares each unordered pair once (article_a_id < article_b_id) using pgvector: 1 − (a <=> b) for embeddings, and for TF-IDF vectors from the same corpus. N articles give N(N − 1)/2 pairs.",
      status: Status.Todo,
    },
  ],
  outputs: [gnewsArticleDailySimilarity],
  notes: [
    "One calculation scope per category and UTC publication date; no cross-date comparisons initially.",
    "Model and configuration versions are recorded for reproducibility.",
    "Rows are refreshed when article sets or vectors change.",
  ],
};
