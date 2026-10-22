import {
  ColumnType,
  DatasetKind,
  SortDirection,
  Status,
  StepKind,
  type ExternalDataset,
  type PipelineStep,
  type RelationDataset,
} from "../core/index.ts";

const gnewsTopHeadlines: ExternalDataset = {
  kind: DatasetKind.External,
  name: "GNews top headlines API",
  description:
    "Top headlines filtered by category, language, country and publication time range.",
  url: "https://gnews.io/docs/v4",
};

export const gnewsArticle: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article",
  description:
    "Original GNews article JSON, one row per article per collection.",
  columns: [
    { name: "id" },
    { name: "gnews_id" },
    { name: "category" },
    { name: "collection_date", type: ColumnType.Date },
    { name: "language" },
    { name: "country" },
    { name: "data", type: ColumnType.Json },
    { name: "first_ingested_at", type: ColumnType.Timestamp },
    { name: "last_ingested_at", type: ColumnType.Timestamp },
  ],
  sortBy: [
    { column: "collection_date", direction: SortDirection.Descending },
    { column: "id", direction: SortDirection.Descending },
  ],
};

export const gnewsIngestion: PipelineStep = {
  id: "gnews-ingestion",
  kind: StepKind.Ingestion,
  name: "GNews ingestion",
  summary:
    "Collects top headlines from GNews and stores each article's original JSON.",
  inputs: [gnewsTopHeadlines],
  transformations: [
    {
      name: "Fetch top headlines",
      description:
        "Requests one category, language, country and UTC day at a time, 10 articles per page, until the reported total is reached or the request limit (10 by default) runs out.",
      status: Status.Implemented,
      implementedIn: [
        "src/py/news/clients/gnews_client.py",
        "src/py/news/ingestion/gnews_ingestion.py",
        "scripts/ingest_gnews.py",
      ],
    },
    {
      name: "Upsert raw articles",
      description:
        "Stores each article's JSON unchanged, keyed by GNews ID and collection (category, collection date, language, country). Re-running a day refreshes data and last_ingested_at instead of adding rows. Each page is one transaction.",
      status: Status.Implemented,
      implementedIn: ["src/py/news/repository/gnews_article_repository.py"],
    },
  ],
  outputs: [gnewsArticle],
  notes: [
    "The original JSON is preserved untransformed as the source of truth.",
    "collection_date is the requested collection date, not necessarily the publication date.",
    "An article can appear in several collections.",
  ],
};
