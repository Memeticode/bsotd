import { isEditorial } from "./editorial.ts";
import { jobOutputs } from "./graph.ts";
import { DatasetKind, type Pipeline } from "./models/index.ts";

/**
 * Checks a pipeline definition and returns it unchanged, throwing on the
 * first problem. Requiring each job to come after the jobs it reads from also
 * rules out cycles.
 */
export function definePipeline(pipeline: Pipeline): Pipeline {
  const jobIds = new Set<string>();
  // Dataset name -> ID of the job that produces it.
  const producers = new Map<string, string>();
  // Names of datasets that jobs may read.
  const outputs = new Set<string>();

  for (const job of pipeline.jobs) {
    if (jobIds.has(job.id)) {
      throw new Error(`Duplicate job id "${job.id}".`);
    }
    jobIds.add(job.id);

    if (job.steps.length === 0) {
      throw new Error(`Job "${job.id}" has no steps.`);
    }

    // External data and editors' tables come from outside the jobs.
    for (const input of job.inputs) {
      if (
        input.kind !== DatasetKind.External &&
        !isEditorial(input) &&
        !outputs.has(input.name)
      ) {
        throw new Error(
          `Job "${job.id}" reads "${input.name}", which no earlier job outputs.`,
        );
      }
    }

    for (const dataset of job.steps.flatMap((step) => step.produces)) {
      if (isEditorial(dataset)) {
        throw new Error(
          `Job "${job.id}" produces "${dataset.name}", which editors write.`,
        );
      }

      const producer = producers.get(dataset.name);

      if (producer !== undefined) {
        throw new Error(
          `"${dataset.name}" is produced twice: by "${producer}" and by "${job.id}".`,
        );
      }

      producers.set(dataset.name, job.id);
    }

    for (const output of jobOutputs(job)) {
      outputs.add(output.name);
    }
  }

  return pipeline;
}
