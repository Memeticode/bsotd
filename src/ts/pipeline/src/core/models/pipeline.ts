import type { PipelineJob } from "./pipeline-job.ts";

export interface Pipeline {
  name: string;
  description: string;
  /** In dependency order: each job after the jobs it reads from. */
  jobs: PipelineJob[];
  principles?: string[];
}
