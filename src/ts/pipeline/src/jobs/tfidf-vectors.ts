import {
  DatasetKind,
  PipelineJobStepKind,
  Status,
  type PipelineJob,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleDaily } from "./gnews-ingestion.ts";

export const gnewsArticleTitleAndDescriptionTfidfCorpus: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_title_and_description_tfidf_corpus",
  description:
    "One fitted TF-IDF model per category and UTC publication date: its configuration, vocabulary and IDF weights.",
};

export const gnewsArticleTitleAndDescriptionTfidf: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_title_and_description_tfidf",
  description: "One sparse TF-IDF vector per article in a corpus.",
};

export const vGnewsArticleTitleAndDescriptionTfidf: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_title_and_description_tfidf",
  description:
    "TF-IDF vectors and corpus metadata joined to their articles' fields from the daily processing set.",
};

export const tfidfVectors: PipelineJob = {
  id: "tfidf-vectors",
  name: "TF-IDF vectors",
  summary:
    "Fits TF-IDF per category and day and stores a sparse vector per article.",
  inputs: [vGnewsArticleDaily],
  steps: [
    {
      kind: PipelineJobStepKind.Model,
      name: "Fit corpus and vectorize articles",
      description:
        "Fits a scikit-learn TfidfVectorizer on the titles and descriptions of one category and UTC publication date, with single words and word pairs, English stop words removed, sublinear term frequency and L2 normalization. It stores the corpus's configuration, vocabulary and IDF weights, then each article's vector as a pgvector sparsevec linked to the corpus. A day is refitted only when its texts or the configuration change.",
      status: Status.Implemented,
      implementedIn: [
        "scripts/vectorize_gnews.py",
        "src/py/news/tfidf/gnews_article_tfidf.py",
        "src/py/news/tfidf/tfidf_corpus.py",
        "src/py/news/repository/gnews_article_tfidf_repository.py",
        "src/py/news/repository/gnews_daily_article_repository.py",
      ],
      produces: [
        gnewsArticleTitleAndDescriptionTfidfCorpus,
        gnewsArticleTitleAndDescriptionTfidf,
      ],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Join to daily articles",
      description:
        "Pairs each vector and its corpus metadata with its article's fields from the daily processing set.",
      status: Status.Implemented,
      produces: [vGnewsArticleTitleAndDescriptionTfidf],
    },
  ],
  notes: [
    "Each corpus covers one category's articles for one day.",
    "Vectors from different corpora must not be compared.",
    "Rebuilding a corpus requires rebuilding its vectors, and removes the pairs scored from them.",
    "Uses title and description only.",
  ],
};
