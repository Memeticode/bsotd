import {
  DatasetKind,
  PipelineJobStepKind,
  Status,
  type PipelineJob,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleDaily } from "./gnews-ingestion.ts";

export const gnewsArticleTitleAndDescriptionEmbedding: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_title_and_description_embedding",
  description: "One embedding per article, model and input text.",
};

export const vGnewsArticleTitleAndDescriptionEmbedded: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_title_and_description_embedded",
  description: "Embeddings joined to their articles' fields from the daily processing set.",
};

export const sentenceEmbeddings: PipelineJob = {
  id: "sentence-embeddings",
  name: "Sentence embeddings",
  summary:
    "Embeds each article's title and description with BAAI/bge-small-en-v1.5.",
  inputs: [vGnewsArticleDaily],
  steps: [
    {
      kind: PipelineJobStepKind.Model,
      name: "Embed titles and descriptions",
      description:
        "Selects the daily processing set for one category and UTC publication date, joins each title and description with a newline, and embeds the text with BAAI/bge-small-en-v1.5 via fastembed (ONNX Runtime) on CPU. The text's SHA-256 is stored as input_hash, so an article is embedded again only when its text or the model changes.",
      status: Status.Implemented,
      implementedIn: [
        "scripts/embed_gnews.py",
        "src/py/news/embedding/gnews_article_embedding.py",
        "src/py/news/embedding/text_embedder.py",
        "src/py/news/text/input_text.py",
        "src/py/news/repository/gnews_article_embedding_repository.py",
      ],
      produces: [gnewsArticleTitleAndDescriptionEmbedding],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Join to daily articles",
      description:
        "Pairs each embedding with its article's fields from the daily processing set.",
      status: Status.Implemented,
      produces: [vGnewsArticleTitleAndDescriptionEmbedded],
    },
  ],
  notes: [
    "Vectors are unit length with 384 dimensions and are generated independently per article.",
    "An embedding must match the article's current input hash and model.",
    "Uses title and description only.",
  ],
};
