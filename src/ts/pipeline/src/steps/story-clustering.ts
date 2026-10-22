import {
  DatasetKind,
  Status,
  StepKind,
  type PipelineStep,
  type PlannedDataset,
} from "../core/index.ts";
import { gnewsArticleDailySimilarity } from "./daily-pair-similarity.ts";

export const storyGroups: PlannedDataset = {
  kind: DatasetKind.Planned,
  name: "Story groups",
  description:
    "Articles assigned to stories within one category and UTC publication day.",
  expectedFields: [
    "story_id",
    "category",
    "published_date",
    "associated article IDs",
    "clustering method/version",
    "clustering metadata",
  ],
};

export const storyClustering: PipelineStep = {
  id: "story-clustering",
  kind: StepKind.Model,
  name: "Story clustering",
  summary:
    "Groups articles covering the same event or development within one UTC publication day.",
  inputs: [gnewsArticleDailySimilarity],
  transformations: [
    {
      name: "Cluster articles",
      description:
        "Combines embedding and TF-IDF similarity into story groups. Candidate methods: hierarchical/agglomerative clustering, threshold-based grouping or hybrid similarity scoring.",
      status: Status.Todo,
    },
    {
      name: "Evaluate clusters",
      description:
        "Measures false merges and false splits, so similar topics aren't mistaken for the same story.",
      status: Status.Todo,
    },
    {
      name: "Manual corrections",
      description: "Lets editors correct article-to-story assignments.",
      status: Status.Todo,
    },
  ],
  outputs: [storyGroups],
  notes: [
    "Clustering starts within one UTC publication day; persistent stories across dates are a future extension.",
    "Article-to-story assignments are preserved.",
  ],
};
