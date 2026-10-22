import { DatasetKind, Status, StepKind } from "@bsotd/pipeline/core";

export const STATUS_LABELS: Record<Status, string> = {
  [Status.Implemented]: "Implemented",
  [Status.InProgress]: "In progress",
  [Status.Todo]: "To do",
};

export const STEP_KIND_LABELS: Record<StepKind, string> = {
  [StepKind.Ingestion]: "Ingestion",
  [StepKind.Sql]: "SQL",
  [StepKind.Model]: "Model",
  [StepKind.Llm]: "LLM",
  [StepKind.Presentation]: "Presentation",
};

export const DATASET_KIND_LABELS: Record<DatasetKind, string> = {
  [DatasetKind.Table]: "Table",
  [DatasetKind.View]: "View",
  [DatasetKind.Planned]: "Planned",
  [DatasetKind.External]: "External",
};
