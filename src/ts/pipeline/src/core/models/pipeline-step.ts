import type { Dataset, OutputDataset } from "./dataset.ts";
import type { Transformation } from "./transformation.ts";

/** How a step runs. */
export const StepKind = {
  /** Brings data in from outside the pipeline. */
  Ingestion: "ingestion",
  /** Deterministic transformation in PostgreSQL. */
  Sql: "sql",
  /** Model-dependent computation in Python. */
  Model: "model",
  /** LLM-assisted analysis. */
  Llm: "llm",
  /** Presents results to readers. */
  Presentation: "presentation",
} as const;

export type StepKind = (typeof StepKind)[keyof typeof StepKind];

/**
 * A logical group of transformations and the data they read and write.
 * Steps are connected by matching their inputs to other steps' outputs.
 */
export interface PipelineStep {
  /** Stable identifier, used in URLs. */
  id: string;
  kind: StepKind;
  name: string;
  summary: string;
  inputs: Dataset[];
  transformations: Transformation[];
  outputs: OutputDataset[];
  /** Constraints and design decisions worth knowing. */
  notes?: string[];
}
