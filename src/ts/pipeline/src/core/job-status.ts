import { Status, type PipelineJob } from "./models/index.ts";

/**
 * A job is implemented, or to do, only when all of its steps are. Anything
 * mixed is in progress.
 */
export function jobStatus(job: PipelineJob): Status {
  const statuses = new Set(job.steps.map((step) => step.status));
  const [only] = statuses;

  return statuses.size === 1 && only !== undefined ? only : Status.InProgress;
}
