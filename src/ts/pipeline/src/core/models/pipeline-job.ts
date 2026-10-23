import type { Dataset } from "./dataset.ts";
import type { PipelineJobStep } from "./pipeline-job-step.ts";

/**
 * A job in the pipeline: a mini pipeline of steps, typically code that runs
 * followed by SQL steps on the data it writes. What the last step produces is
 * the job's output, which later jobs read; everything else stays inside.
 */
export interface PipelineJob {
  /** Stable identifier, used in URLs. */
  id: string;
  name: string;
  summary: string;
  inputs: Dataset[];
  /** In order. */
  steps: PipelineJobStep[];
  /** Constraints and design decisions worth knowing. */
  notes?: string[];
}
