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

export const gnewsArticleTitleAndDescriptionEmbedding: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_title_and_description_embedding",
  description: "One embedding per article, model and input text.",
  columns: [
    { name: "id" },
    { name: "gnews_article_id" },
    { name: "model" },
    { name: "input_hash" },
    { name: "embedding", type: ColumnType.Vector },
    { name: "created_at", type: ColumnType.Timestamp },
  ],
  sortBy: [
    { column: "created_at", direction: SortDirection.Descending },
    { column: "id", direction: SortDirection.Descending },
  ],
};

export const vGnewsArticleTitleAndDescriptionEmbedded: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_title_and_description_embedded",
  description: "Embeddings joined to their deduplicated articles' fields.",
  columns: [
    { name: "id" },
    { name: "collection_date", type: ColumnType.Date },
    { name: "published_at", type: ColumnType.Timestamp },
    { name: "source_name" },
    { name: "title" },
    { name: "embedding_model" },
    { name: "embedding", type: ColumnType.Vector },
    { name: "embedded_at", type: ColumnType.Timestamp },
  ],
  sortBy: [
    { column: "published_at", direction: SortDirection.Descending },
    { column: "id", direction: SortDirection.Descending },
  ],
};

export const sentenceEmbeddings: PipelineStep = {
  id: "sentence-embeddings",
  kind: StepKind.Model,
  name: "Sentence embeddings",
  summary:
    "Embeds each article's title and description with BAAI/bge-small-en-v1.5.",
  inputs: [vGnewsArticleDeduped],
  transformations: [
    {
      name: "Select daily article set",
      description:
        "Selects deduplicated articles by category and collection date. The design calls for category and UTC publication date instead, with articles repeated across collections deduplicated again.",
      status: Status.InProgress,
      implementedIn: [
        "src/py/news/repository/gnews_article_embedding_repository.py",
      ],
    },
    {
      name: "Build input text",
      description:
        "Joins title and description with a newline and stores the text's SHA-256 as input_hash, so an article is embedded again only when its text or the model changes.",
      status: Status.Implemented,
      implementedIn: ["src/py/news/embedding/gnews_article_embedding.py"],
    },
    {
      name: "Embed",
      description:
        "Runs BAAI/bge-small-en-v1.5 with fastembed (ONNX Runtime) on CPU, producing unit-length 384-dimension vectors.",
      status: Status.Implemented,
      implementedIn: [
        "src/py/news/embedding/text_embedder.py",
        "scripts/embed_gnews.py",
      ],
    },
    {
      name: "Join to deduplicated articles",
      description:
        "A view pairs each embedding with its deduplicated article's fields.",
      status: Status.Implemented,
      implementedIn: ["src/db/001_create.sql"],
    },
  ],
  outputs: [
    gnewsArticleTitleAndDescriptionEmbedding,
    vGnewsArticleTitleAndDescriptionEmbedded,
  ],
  notes: [
    "Embeddings are generated independently per article.",
    "An embedding must match the article's current input hash and model.",
    "Uses title and description only.",
  ],
};
