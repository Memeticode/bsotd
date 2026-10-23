import {
  DatasetKind,
  PipelineJobStepKind,
  Status,
  type PipelineJob,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleDaily } from "./gnews-ingestion.ts";

export const gnewsArticleEmbedding: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_embedding",
  description: "One embedding per article, model and input text.",
};

export const vGnewsArticleEmbedded: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_embedded",
  description:
    "Each daily article's latest embedding per model, with the article's fields.",
};

export const sentenceEmbeddings: PipelineJob = {
  id: "sentence-embeddings",
  name: "Sentence embeddings",
  summary:
    "Embeds each article's title, description and opening with BAAI/bge-small-en-v1.5.",
  inputs: [vGnewsArticleDaily],
  steps: [
    {
      kind: PipelineJobStepKind.Model,
      name: "Embed articles",
      description:
        "Selects the daily processing set for one category and UTC publication date, puts each article's title, description and the first 300 characters of its content on separate lines, and embeds the text with BAAI/bge-small-en-v1.5 via fastembed (ONNX Runtime) on CPU. The text's SHA-256 is stored as input_hash, so an article is embedded again only when its text or the model changes.",
      status: Status.Implemented,
      implementedIn: [
        "scripts/embed_gnews.py",
        "src/py/news/embedding/gnews_article_embedding.py",
        "src/py/news/embedding/text_embedder.py",
        "src/py/news/text/input_text.py",
        "src/py/news/repository/gnews_article_embedding_repository.py",
      ],
      produces: [gnewsArticleEmbedding],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Join to daily articles",
      description:
        "Pairs each article in the daily processing set with its latest embedding per model. Earlier embeddings, of text that has since changed, stay in the table.",
      status: Status.Implemented,
      produces: [vGnewsArticleEmbedded],
    },
  ],
  notes: [
    "Vectors are unit length with 384 dimensions and are generated independently per article.",
    "An embedding must match the article's current input hash and model.",
    "The opening of an article's content carries the specifics when its headline is generic, such as \"cloud cover forecast by region\" for an article about a meteor shower. Much more than 300 characters brings in background that makes different stories look alike.",
  ],
};
