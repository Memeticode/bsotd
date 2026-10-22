import {
  ColumnType,
  DatasetKind,
  SortDirection,
  Status,
  StepKind,
  type PipelineStep,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticle } from "./article-extraction.ts";

export const vGnewsArticleDeduped: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_deduped",
  description:
    "One representative per group of exact duplicates, with the group's size and outlets.",
  columns: [
    { name: "id" },
    { name: "collection_date", type: ColumnType.Date },
    { name: "published_at", type: ColumnType.Timestamp },
    { name: "source_name" },
    { name: "title" },
    { name: "duplicates_count", type: ColumnType.Number },
    { name: "duplicate_source_names", type: ColumnType.List },
    { name: "url", type: ColumnType.Url },
  ],
  sortBy: [
    { column: "collection_date", direction: SortDirection.Descending },
    { column: "duplicates_count", direction: SortDirection.Descending },
    { column: "published_at", direction: SortDirection.Descending },
  ],
};

export const articleDeduplication: PipelineStep = {
  id: "article-deduplication",
  kind: StepKind.Sql,
  name: "Exact deduplication",
  summary:
    "Keeps one representative of each group of articles with the same title and description.",
  inputs: [vGnewsArticle],
  transformations: [
    {
      name: "Normalize title and description",
      description:
        "Lowercases, maps non-breaking spaces and curly quotes to plain ones, collapses whitespace and trims, so formatting differences don't split a group.",
      status: Status.Implemented,
      implementedIn: ["src/db/001_create.sql"],
    },
    {
      name: "Group exact duplicates",
      description:
        "Groups articles whose normalized title and description match within one collection scope: category, collection date, language and country.",
      status: Status.Implemented,
      implementedIn: ["src/db/001_create.sql"],
    },
    {
      name: "Choose a representative",
      description:
        "Keeps the earliest-published article in each group (ties broken by GNews ID, then ID) and records the group's size and the outlets that carried it, earliest first.",
      status: Status.Implemented,
      implementedIn: ["src/db/001_create.sql"],
    },
  ],
  outputs: [vGnewsArticleDeduped],
  notes: [
    "duplicates_count includes the representative.",
    "This is not semantic story clustering.",
    "An article can still appear on several collection dates; daily processing deduplicates again.",
  ],
};
