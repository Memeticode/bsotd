import { DatasetKind, PipelineJobStepKind, Status } from "@bsotd/pipeline/core";

export const STATUS_LABELS: Record<Status, string> = {
  [Status.Implemented]: "Implemented",
  [Status.InProgress]: "In progress",
  [Status.Todo]: "To do",
};

export const JOB_STEP_KIND_LABELS: Record<PipelineJobStepKind, string> = {
  [PipelineJobStepKind.Ingestion]: "Ingestion",
  [PipelineJobStepKind.Model]: "Model",
  [PipelineJobStepKind.Llm]: "LLM",
  [PipelineJobStepKind.Sql]: "SQL",
};

export const DATASET_KIND_LABELS: Record<DatasetKind, string> = {
  [DatasetKind.Table]: "Table",
  [DatasetKind.View]: "View",
  [DatasetKind.Planned]: "Planned",
  [DatasetKind.External]: "External",
};
