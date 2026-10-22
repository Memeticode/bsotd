import {
  DatasetKind,
  Status,
  StepKind,
  type PipelineStep,
  type PlannedDataset,
} from "../core/index.ts";
import { storyRelevanceClassifications } from "./relevance-classification.ts";

export const structuredStoryAnalysis: PlannedDataset = {
  kind: DatasetKind.Planned,
  name: "Structured story analysis",
  description:
    "Claims extracted from each relevant story, linked to their source articles, with how sources agree or differ.",
  expectedFields: [],
};

export const storyAnalysis: PipelineStep = {
  id: "story-analysis",
  kind: StepKind.Llm,
  name: "Story analysis",
  summary:
    "Uses an LLM to extract claims from relevant stories and compare them across sources.",
  inputs: [storyRelevanceClassifications],
  transformations: [
    {
      name: "Extract claims",
      description:
        "Extracts factual claims and key takeaways and links each one to its source articles.",
      status: Status.Todo,
    },
    {
      name: "Compare sources",
      description:
        "Matches equivalent claims across sources to find consensus, disagreement, source-specific reporting and potential contradictions.",
      status: Status.Todo,
    },
    {
      name: "Analyze framing",
      description: "Examines differences in editorial framing.",
      status: Status.Todo,
    },
  ],
  outputs: [structuredStoryAnalysis],
  notes: [
    "Attribution to original articles is preserved.",
    "Syndicated content is accounted for.",
    "Omissions are distinguished from contradictions and aren't treated as evidence of bias on their own.",
    "Human review and correction remain possible.",
  ],
};
