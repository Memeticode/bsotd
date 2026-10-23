import {
  DatasetKind,
  PipelineJobStepKind,
  SortDirection,
  Status,
  type PipelineJob,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleTitleAndDescriptionEmbedded } from "./sentence-embeddings.ts";
import { vGnewsArticleTitleAndDescriptionTfidf } from "./tfidf-vectors.ts";

// Most similar pairs first, within each day.
const mostSimilarFirst = [
  { column: "published_date", direction: SortDirection.Descending },
  {
    column: "embedding_cosine_similarity",
    direction: SortDirection.Descending,
  },
];

export const gnewsArticleDailySimilarity: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_article_daily_similarity",
  description:
    "Embedding and TF-IDF cosine similarity for every unordered pair of articles in a category and UTC publication date.",
  sortBy: mostSimilarFirst,
};

export const vGnewsArticleDailySimilarity: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article_daily_similarity",
  description: "Each pair's similarities with both articles' titles and outlets.",
  sortBy: mostSimilarFirst,
};

export const dailyPairSimilarity: PipelineJob = {
  id: "daily-pair-similarity",
  name: "Daily pair similarity",
  summary:
    "Scores every pair of articles in a category and day by embedding and TF-IDF similarity.",
  inputs: [
    vGnewsArticleTitleAndDescriptionEmbedded,
    vGnewsArticleTitleAndDescriptionTfidf,
  ],
  steps: [
    {
      kind: PipelineJobStepKind.Sql,
      name: "Score article pairs",
      description:
        "For one category and UTC publication date, checks that every article in the two views has an embedding and a TF-IDF vector from its current text, then compares each unordered pair once (article_a_id < article_b_id) with pgvector: 1 − (a <=> b) for embeddings, and for TF-IDF vectors from the day's corpus. N articles give N(N − 1)/2 pairs. A day is scored again when its corpus is rebuilt or the embedding model changes.",
      status: Status.Implemented,
      implementedIn: [
        "scripts/score_gnews.py",
        "src/py/news/similarity/gnews_article_similarity.py",
        "src/py/news/repository/gnews_article_similarity_repository.py",
      ],
      produces: [gnewsArticleDailySimilarity],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Attach titles and outlets",
      description:
        "Adds both articles' titles and outlets to each pair, for reviewing which pairs score as alike.",
      status: Status.Implemented,
      produces: [vGnewsArticleDailySimilarity],
    },
  ],
  notes: [
    "One calculation scope per category and UTC publication date; no cross-date comparisons initially.",
    "Each pair records the embedding model and TF-IDF corpus it was scored with.",
    "TF-IDF similarity is null when either article shares no terms with its corpus's vocabulary.",
  ],
};
