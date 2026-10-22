import type { Pipeline, PipelineStep, StepEdge } from "./models/index.ts";

export function findStep(
  pipeline: Pipeline,
  id: string,
): PipelineStep | undefined {
  return pipeline.steps.find((step) => step.id === id);
}

/** The step that outputs the named dataset, if any step does. */
export function datasetProducer(
  pipeline: Pipeline,
  datasetName: string,
): PipelineStep | undefined {
  return pipeline.steps.find((step) =>
    step.outputs.some((output) => output.name === datasetName),
  );
}

/** One edge per pair of connected steps, in step order. */
export function stepEdges(pipeline: Pipeline): StepEdge[] {
  const edges = new Map<string, StepEdge>();

  for (const step of pipeline.steps) {
    for (const input of step.inputs) {
      const producer = datasetProducer(pipeline, input.name);

      // External inputs have no producing step.
      if (producer === undefined) {
        continue;
      }

      const key = `${producer.id}->${step.id}`;
      const edge = edges.get(key) ?? {
        from: producer.id,
        to: step.id,
        datasets: [],
      };

      edge.datasets.push(input.name);
      edges.set(key, edge);
    }
  }

  return [...edges.values()];
}

/** Steps whose outputs the given step reads. */
export function upstreamSteps(
  pipeline: Pipeline,
  stepId: string,
): PipelineStep[] {
  const ids = new Set(
    stepEdges(pipeline)
      .filter((edge) => edge.to === stepId)
      .map((edge) => edge.from),
  );

  return pipeline.steps.filter((step) => ids.has(step.id));
}

/** Steps that read the given step's outputs. */
export function downstreamSteps(
  pipeline: Pipeline,
  stepId: string,
): PipelineStep[] {
  const ids = new Set(
    stepEdges(pipeline)
      .filter((edge) => edge.from === stepId)
      .map((edge) => edge.to),
  );

  return pipeline.steps.filter((step) => ids.has(step.id));
}
