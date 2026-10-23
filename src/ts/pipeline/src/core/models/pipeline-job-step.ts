import type { OutputDataset } from "./dataset.ts";
import type { Status } from "./status.ts";

/** How a pipeline job's step runs. */
export const PipelineJobStepKind = {
  /** Runs code that brings data in from outside the pipeline. */
  Ingestion: "ingestion",
  /** Runs model-dependent computation in Python. */
  Model: "model",
  /** Runs LLM-assisted analysis. */
  Llm: "llm",
  /** A SQL transformation: a view, or a table built by SQL. */
  Sql: "sql",
} as const;

export type PipelineJobStepKind =
  (typeof PipelineJobStepKind)[keyof typeof PipelineJobStepKind];

/**
 * One link in a pipeline job's chain: code that runs, or a SQL
 * transformation. Each step reads what the steps before it produced.
 */
export interface PipelineJobStep {
  kind: PipelineJobStepKind;
  name: string;
  description: string;
  status: Status;
  /** Repository paths of the code it runs. SQL steps' SQL lives in the database. */
  implementedIn?: string[];
  produces: OutputDataset[];
}
