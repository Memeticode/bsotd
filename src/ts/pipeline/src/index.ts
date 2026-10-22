import { definePipeline } from "./core/index.ts";
import { articleDeduplication } from "./steps/article-deduplication.ts";
import { articleExtraction } from "./steps/article-extraction.ts";
import { dailyPairSimilarity } from "./steps/daily-pair-similarity.ts";
import { gnewsIngestion } from "./steps/gnews-ingestion.ts";
import { relevanceClassification } from "./steps/relevance-classification.ts";
import { sentenceEmbeddings } from "./steps/sentence-embeddings.ts";
import { storyAnalysis } from "./steps/story-analysis.ts";
import { storyClustering } from "./steps/story-clustering.ts";
import { storyPresentation } from "./steps/story-presentation.ts";
import { tfidfVectors } from "./steps/tfidf-vectors.ts";

export const newsPipeline = definePipeline({
  name: "News intelligence pipeline",
  description:
    "Turns GNews articles into stories: collect and preserve source articles, remove exact duplicates, measure semantic and lexical similarity, group related articles into stories, rank stories by relevance, and eventually extract and compare claims across sources.",
  steps: [
    gnewsIngestion,
    articleExtraction,
    articleDeduplication,
    sentenceEmbeddings,
    tfidfVectors,
    dailyPairSimilarity,
    storyClustering,
    relevanceClassification,
    storyAnalysis,
    storyPresentation,
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
