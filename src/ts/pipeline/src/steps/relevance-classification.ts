import {
  DatasetKind,
  Status,
  StepKind,
  type PipelineStep,
  type PlannedDataset,
} from "../core/index.ts";
import { storyGroups } from "./story-clustering.ts";

export const storyRelevanceClassifications: PlannedDataset = {
  kind: DatasetKind.Planned,
  name: "Story relevance classifications",
  description:
    "A relevance rank per story, with the classifier and criteria that produced it and any editorial override.",
  expectedFields: [
    "story_id",
    "category",
    "relevance_rank",
    "classifier_model",
    "criteria_version",
    "classification metadata",
    "human_override",
  ],
};

export const relevanceClassification: PipelineStep = {
  id: "relevance-classification",
  kind: StepKind.Model,
  name: "Relevance classification",
  summary: "Ranks stories by relevance and significance after grouping.",
  inputs: [storyGroups],
  transformations: [
    {
      name: "Classify stories",
      description:
        "A lightweight classifier assigns each story a relevance rank. Classifying stories rather than articles avoids classifying the same story repeatedly.",
      status: Status.Todo,
    },
    {
      name: "Editorial overrides",
      description:
        "Editors can override a classification; the classifier's output is kept alongside.",
      status: Status.Todo,
    },
  ],
  outputs: [storyRelevanceClassifications],
  notes: [
    "Category relevance is kept separate from story importance.",
    "Classifications and processing metadata are retained.",
  ],
};
