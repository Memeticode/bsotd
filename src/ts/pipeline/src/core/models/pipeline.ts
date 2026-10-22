import type { PipelineStep } from "./pipeline-step.ts";

export interface Pipeline {
  name: string;
  description: string;
  /** Steps in dependency order: each step after the steps it reads from. */
  steps: PipelineStep[];
  principles?: string[];
}
