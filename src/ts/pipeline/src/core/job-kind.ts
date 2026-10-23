import { PipelineJobStepKind, type PipelineJob } from "./models/index.ts";

/**
 * A job's kind is that of the step that runs code: the first step that isn't
 * SQL, or SQL when all of its steps are.
 */
export function jobKind(job: PipelineJob): PipelineJobStepKind {
  return (
    job.steps.find((step) => step.kind !== PipelineJobStepKind.Sql)?.kind ??
    PipelineJobStepKind.Sql
  );
}
