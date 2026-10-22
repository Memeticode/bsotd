import {
  ColumnType,
  DatasetKind,
  SortDirection,
  Status,
  StepKind,
  type PipelineStep,
  type RelationDataset,
} from "../core/index.ts";
import { gnewsArticle } from "./gnews-ingestion.ts";

export const vGnewsArticle: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article",
  description: "Article and publisher fields extracted from the raw JSON.",
  columns: [
    { name: "id" },
    { name: "category" },
    { name: "collection_date", type: ColumnType.Date },
    { name: "published_at", type: ColumnType.Timestamp },
    { name: "source_name" },
    { name: "title" },
    { name: "description" },
    { name: "content" },
    { name: "url", type: ColumnType.Url },
  ],
  sortBy: [
    { column: "published_at", direction: SortDirection.Descending },
    { column: "id", direction: SortDirection.Descending },
  ],
};

export const articleExtraction: PipelineStep = {
  id: "article-extraction",
  kind: StepKind.Sql,
  name: "Article extraction",
  summary: "Flattens the raw JSON into article and publisher columns.",
  inputs: [gnewsArticle],
  transformations: [
    {
      name: "Extract JSON fields",
      description:
        "JSONB operators pull out the title, description, content, URL, image, publication time and publisher fields. publishedAt is cast to timestamptz and read as UTC.",
      status: Status.Implemented,
      implementedIn: ["src/db/001_create.sql"],
    },
  ],
  outputs: [vGnewsArticle],
  notes: [
    "Not materialized: the raw table stays the source of truth.",
    "source_country is always empty because GNews doesn't return a publisher country.",
  ],
};
