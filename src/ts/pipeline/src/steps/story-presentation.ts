import { Status, StepKind, type PipelineStep } from "../core/index.ts";
import { structuredStoryAnalysis } from "./story-analysis.ts";

export const storyPresentation: PipelineStep = {
  id: "story-presentation",
  kind: StepKind.Presentation,
  name: "Story presentation",
  summary:
    "Publishes stories and their analysis in a story-centric news application.",
  inputs: [structuredStoryAnalysis],
  transformations: [
    {
      name: "Story-centric application",
      description:
        "Daily story feeds with summaries, relevance rankings, key takeaways, source comparisons and supporting evidence.",
      status: Status.Todo,
    },
    {
      name: "Editorial review interface",
      description:
        "Where editors review and correct stories, classifications and analysis.",
      status: Status.Todo,
    },
  ],
  outputs: [],
};
