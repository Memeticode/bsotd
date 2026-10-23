import {
  DatasetKind,
  PipelineJobStepKind,
  SortDirection,
  Status,
  type ExternalDataset,
  type PipelineJob,
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
};

export const vGnewsArticle: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article",
  description: "Article and publisher fields extracted from the raw JSON.",
};

export const vGnewsArticleNormalized: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_normalized",
  description:
    "Extracted articles with comparison keys for their titles and descriptions.",
};

export const vGnewsArticleRanked: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_ranked",
  description:
    "Every article with its duplicate group's size and outlets, and its rank within the group.",
  // Keeps each group's articles together, in rank order.
  sortBy: [
    { column: "collection_date", direction: SortDirection.Descending },
    { column: "duplicates_count", direction: SortDirection.Descending },
    { column: "title_key", direction: SortDirection.Ascending },
    { column: "rn", direction: SortDirection.Ascending },
  ],
};

export const vGnewsArticleDeduped: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_deduped",
  description:
    "One representative per group of exact duplicates, with the group's size and outlets.",
};

export const vGnewsArticleDaily: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_daily",
  description:
    "The daily processing set: one row per article per category and UTC publication date.",
  sortBy: [
    { column: "published_date", direction: SortDirection.Descending },
    { column: "published_at", direction: SortDirection.Descending },
  ],
};

export const gnewsIngestion: PipelineJob = {
  id: "gnews-ingestion",
  name: "GNews ingestion",
  summary:
    "Collects top headlines from GNews, keeps each article's original JSON, and exposes one row per distinct article per day.",
  inputs: [gnewsTopHeadlines],
  steps: [
    {
      kind: PipelineJobStepKind.Ingestion,
      name: "Fetch and store top headlines",
      description:
        "Requests top headlines for one category, language, country and UTC day, 10 articles per page, until the reported total is reached or the request limit (10 by default) runs out. Each article's JSON is upserted unchanged, keyed by GNews ID and collection, so re-running a day refreshes rows instead of adding them.",
      status: Status.Implemented,
      implementedIn: [
        "scripts/ingest_gnews.py",
        "src/py/news/clients/gnews_client.py",
        "src/py/news/ingestion/gnews_ingestion.py",
        "src/py/news/repository/gnews_article_repository.py",
      ],
      produces: [gnewsArticle],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Extract JSON fields",
      description:
        "JSONB operators pull out the title, description, content, URL, image, publication time and publisher fields. publishedAt is cast to timestamptz and read as UTC.",
      status: Status.Implemented,
      produces: [vGnewsArticle],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Normalize title and description",
      description:
        "Adds title_key and description_key: lowercased, with non-breaking spaces and curly quotes mapped to plain ones and whitespace collapsed, so formatting differences don't split a group.",
      status: Status.Implemented,
      produces: [vGnewsArticleNormalized],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Group exact duplicates",
      description:
        "Groups articles whose keys match within one collection (category, collection date, language and country), counting each group and listing its outlets. rn ranks a group's articles by publication time, then GNews ID, then ID.",
      status: Status.Implemented,
      produces: [vGnewsArticleRanked],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Choose a representative",
      description:
        "Keeps the first-ranked article of each group, with its group's size and outlets.",
      status: Status.Implemented,
      produces: [vGnewsArticleDeduped],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Select the daily processing set",
      description:
        "Adds each representative's UTC publication date and keeps one row per article per category and publication date. An article collected more than once, for another country or language say, is kept from its earliest collection.",
      status: Status.Implemented,
      produces: [vGnewsArticleDaily],
    },
  ],
  notes: [
    "The original JSON is preserved untransformed as the source of truth; the views are unmaterialized.",
    "collection_date is the requested collection date, not necessarily the publication date, and an article can appear in several collections.",
    "source_country is always empty because GNews doesn't return a publisher country.",
    "duplicates_count includes the representative.",
    "Exact deduplication is not semantic story clustering.",
    "Later jobs work on one category and UTC publication date at a time, from the daily processing set.",
  ],
};
