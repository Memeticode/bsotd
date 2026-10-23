import {
  DatasetKind,
  PipelineJobStepKind,
  SortDirection,
  Status,
  type PipelineJob,
  type RelationDataset,
} from "../core/index.ts";
import { vGnewsArticleDaily } from "./gnews-ingestion.ts";
import { vGnewsStoryRanked } from "./relevance-classification.ts";

export const gnewsStoryAnalysisReview: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_story_analysis_review",
  description: "Editors' verdicts on analyses: approved or rejected, with a note.",
  editorial: true,
};

export const gnewsStoryAnalysis: RelationDataset = {
  kind: DatasetKind.Table,
  name: "news.gnews_story_analysis",
  description:
    "Every analysis the model has made: its response, the analysis checked against the story's articles, and token usage.",
};

export const vGnewsStoryAnalysis: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_story_analysis",
  description:
    "Each story's latest analysis: headline, summary, takeaways, claims, framing and review.",
};

export const vGnewsStoryClaim: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_story_claim",
  description:
    "One row per claim, with the independent reports that support or contradict it.",
  sortBy: [
    { column: "story_id", direction: SortDirection.Descending },
    { column: "claim_number", direction: SortDirection.Ascending },
  ],
};

export const storyAnalysis: PipelineJob = {
  id: "story-analysis",
  name: "Story analysis",
  summary:
    "Uses an LLM to extract claims from relevant stories and compare them across sources.",
  inputs: [vGnewsStoryRanked, vGnewsArticleDaily, gnewsStoryAnalysisReview],
  steps: [
    {
      kind: PipelineJobStepKind.Llm,
      name: "Analyze stories",
      description:
        "For each day's highest-ranked stories that fit their category (the top five, with importance 2 or more, by default), Claude reads the full articles and returns a neutral headline, summary and takeaways; the story's claims, each marked fact or interpretation, with every article that supports or contradicts it and a quote as evidence; groups of syndicated copies; and each article's framing. Anything citing articles outside the story is dropped before saving.",
      status: Status.Implemented,
      implementedIn: [
        "scripts/analyze_gnews.py",
        "src/py/news/stories/gnews_story_analysis.py",
        "src/py/news/stories/story_analysis.py",
        "src/py/news/stories/story.py",
        "src/py/news/clients/claude_client.py",
        "src/py/news/repository/gnews_story_analysis_repository.py",
        "src/py/news/repository/gnews_story_reader.py",
      ],
      produces: [gnewsStoryAnalysis],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Pick each story's latest analysis",
      description:
        "Extracts the latest analysis's headline, summary, takeaways and framing, with its editorial review. analysis_is_current is false when the story's articles have changed since.",
      status: Status.Implemented,
      produces: [vGnewsStoryAnalysis],
    },
    {
      kind: PipelineJobStepKind.Sql,
      name: "Compare claims across sources",
      description:
        "Counts the independent reports behind each claim, counting syndicated copies once: disputed when any contradicts it, corroborated when two or more support it, and single source otherwise. Articles that don't mention a claim are listed apart from those that contradict it.",
      status: Status.Implemented,
      produces: [vGnewsStoryClaim],
    },
  ],
  notes: [
    "Attribution to original articles is preserved: every claim cites its articles and quotes them.",
    "Syndicated content is accounted for: copies count as one report.",
    "Omissions are distinguished from contradictions and aren't treated as evidence of bias on their own.",
    "Editors can approve or reject each analysis from the story page.",
  ],
};
