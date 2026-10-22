import { DatasetKind, type Pipeline } from "./models/index.ts";

/**
 * Checks a pipeline definition and returns it unchanged, throwing on the
 * first problem. Requiring each step to come after the steps it reads from
 * also rules out cycles.
 */
export function definePipeline(pipeline: Pipeline): Pipeline {
  const stepIds = new Set<string>();
  // Dataset name -> ID of the step that outputs it.
  const producers = new Map<string, string>();

  for (const step of pipeline.steps) {
    if (stepIds.has(step.id)) {
      throw new Error(`Duplicate step id "${step.id}".`);
    }
    stepIds.add(step.id);

    if (step.transformations.length === 0) {
      throw new Error(`Step "${step.id}" has no transformations.`);
    }

    for (const input of step.inputs) {
      if (input.kind !== DatasetKind.External && !producers.has(input.name)) {
        throw new Error(
          `Step "${step.id}" reads "${input.name}", which no earlier step outputs.`,
        );
      }
    }

    for (const output of step.outputs) {
      const producer = producers.get(output.name);

      if (producer !== undefined) {
        throw new Error(
          `"${output.name}" is output by both "${producer}" and "${step.id}".`,
        );
      }

      producers.set(output.name, step.id);
    }
  }

  return pipeline;
}
