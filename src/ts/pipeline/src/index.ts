import { definePipeline } from "./core/index.ts";
import { dailyPairSimilarity } from "./jobs/daily-pair-similarity.ts";
import { gnewsIngestion } from "./jobs/gnews-ingestion.ts";
import { relevanceClassification } from "./jobs/relevance-classification.ts";
import { sentenceEmbeddings } from "./jobs/sentence-embeddings.ts";
import { storyAnalysis } from "./jobs/story-analysis.ts";
import { storyClustering } from "./jobs/story-clustering.ts";
import { tfidfVectors } from "./jobs/tfidf-vectors.ts";

export const jobsPipeline = definePipeline({
  name: "Jobs pipeline",
  description:
    "Turns GNews articles into stories: collect and preserve source articles, remove exact duplicates, measure semantic and lexical similarity, group related articles into stories, rank stories by relevance, and extract and compare claims across sources, with editors able to correct each stage.",
  jobs: [
    gnewsIngestion,
    sentenceEmbeddings,
    tfidfVectors,
    dailyPairSimilarity,
    storyClustering,
    relevanceClassification,
    storyAnalysis,
  ],
  principles: [
    "PostgreSQL is the central data store.",
    "Raw API data is preserved.",
    "Views expose deterministic relational transformations.",
    "Python performs model-dependent computations.",
    "Expensive operations are persisted rather than recomputed with every query.",
    "Pipeline stages have explicit inputs and outputs.",
    "Daily category groups are the initial processing unit.",
    "Story grouping precedes relevance classification.",
    "Processing should be reproducible and versioned.",
    "Human review remains possible at every major stage.",
  ],
});
