import {
  ColumnType,
  DatasetKind,
  SortDirection,
  Status,
  StepKind,
  type PipelineStep,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleDeduped } from "./article-deduplication.ts";

export const gnewsArticleTitleAndDescriptionTfidfCorpus: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_title_and_description_tfidf_corpus",
  description:
    "One fitted TF-IDF model per category and UTC publication date: its configuration, vocabulary and IDF weights.",
  columns: [
    { name: "id" },
    { name: "category" },
    { name: "published_date", type: ColumnType.Date },
    { name: "configuration", type: ColumnType.Json },
    { name: "document_count", type: ColumnType.Number },
    { name: "created_at", type: ColumnType.Timestamp },
  ],
  sortBy: [
    { column: "published_date", direction: SortDirection.Descending },
    { column: "category", direction: SortDirection.Ascending },
  ],
};

export const gnewsArticleTitleAndDescriptionTfidf: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_title_and_description_tfidf",
  description: "One sparse TF-IDF vector per article in a corpus.",
  columns: [
    { name: "id" },
    { name: "corpus_id" },
    { name: "gnews_article_id" },
    { name: "input_hash" },
    { name: "tfidf", type: ColumnType.SparseVector },
    { name: "created_at", type: ColumnType.Timestamp },
  ],
  sortBy: [
    { column: "corpus_id", direction: SortDirection.Descending },
    { column: "gnews_article_id", direction: SortDirection.Ascending },
  ],
};

export const vGnewsArticleTitleAndDescriptionTfidf: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_title_and_description_tfidf",
  description:
    "TF-IDF vectors and corpus metadata joined to their deduplicated articles' fields.",
  columns: [
    { name: "id" },
    { name: "published_at", type: ColumnType.Timestamp },
    { name: "source_name" },
    { name: "title" },
    { name: "tfidf_corpus_id" },
    { name: "tfidf_document_count", type: ColumnType.Number },
    { name: "tfidf", type: ColumnType.SparseVector },
    { name: "tfidf_created_at", type: ColumnType.Timestamp },
  ],
  sortBy: [
    { column: "published_at", direction: SortDirection.Descending },
    { column: "id", direction: SortDirection.Descending },
  ],
};

export const tfidfVectors: PipelineStep = {
  id: "tfidf-vectors",
  kind: StepKind.Model,
  name: "TF-IDF vectors",
  summary:
    "Fits TF-IDF per category and day and stores a sparse vector per article.",
  inputs: [vGnewsArticleDeduped],
  transformations: [
    {
      name: "Fit daily corpus",
      description:
        "Fits a scikit-learn TfidfVectorizer on the titles and descriptions of one category and UTC publication date, storing its configuration, vocabulary and IDF weights.",
      status: Status.Todo,
    },
    {
      name: "Vectorize articles",
      description:
        "Stores each article's TF-IDF vector as a pgvector sparsevec linked to its corpus.",
      status: Status.Todo,
    },
    {
      name: "Join to deduplicated articles",
      description:
        "A view pairs each vector and its corpus metadata with the deduplicated article's fields.",
      status: Status.Implemented,
      implementedIn: ["src/db/001_create.sql"],
    },
  ],
  outputs: [
    gnewsArticleTitleAndDescriptionTfidfCorpus,
    gnewsArticleTitleAndDescriptionTfidf,
    vGnewsArticleTitleAndDescriptionTfidf,
  ],
  notes: [
    "Each corpus covers one category's articles for one day.",
    "Vectors from different corpora must not be compared.",
    "Rebuilding a corpus requires rebuilding its vectors.",
    "Uses title and description only.",
  ],
};
