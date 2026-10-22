import { Status, type PipelineStep } from "./models/index.ts";

/**
 * A step is implemented, or to do, only when all of its transformations are.
 * Anything mixed is in progress.
 */
export function stepStatus(step: PipelineStep): Status {
  const statuses = new Set(step.transformations.map((t) => t.status));
  const [only] = statuses;

  return statuses.size === 1 && only !== undefined ? only : Status.InProgress;
}
