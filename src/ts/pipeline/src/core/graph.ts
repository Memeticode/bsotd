import type {
  OutputDataset,
  Pipeline,
  PipelineJob,
  PipelineJobEdge,
} from "./models/index.ts";

export function findJob(
  pipeline: Pipeline,
  id: string,
): PipelineJob | undefined {
  return pipeline.jobs.find((job) => job.id === id);
}

/** What a job's last step produces: the data later jobs can read. */
export function jobOutputs(job: PipelineJob): OutputDataset[] {
  return job.steps.at(-1)?.produces ?? [];
}

/** The job that outputs the named dataset, if any does. */
export function datasetProducer(
  pipeline: Pipeline,
  datasetName: string,
): PipelineJob | undefined {
  return pipeline.jobs.find((job) =>
    jobOutputs(job).some((output) => output.name === datasetName),
  );
}

/** One edge per pair of connected jobs, in job order. */
export function jobEdges(pipeline: Pipeline): PipelineJobEdge[] {
  const edges = new Map<string, PipelineJobEdge>();

  for (const job of pipeline.jobs) {
    for (const input of job.inputs) {
      const producer = datasetProducer(pipeline, input.name);

      // External inputs have no producing job.
      if (producer === undefined) {
        continue;
      }

      const key = `${producer.id}->${job.id}`;
      const edge = edges.get(key) ?? {
        from: producer.id,
        to: job.id,
        datasets: [],
      };

      edge.datasets.push(input.name);
      edges.set(key, edge);
    }
  }

  return [...edges.values()];
}

/** Jobs whose outputs the given job reads. */
export function upstreamJobs(pipeline: Pipeline, jobId: string): PipelineJob[] {
  const ids = new Set(
    jobEdges(pipeline)
      .filter((edge) => edge.to === jobId)
      .map((edge) => edge.from),
  );

  return pipeline.jobs.filter((job) => ids.has(job.id));
}

/** Jobs that read the given job's outputs. */
export function downstreamJobs(pipeline: Pipeline, jobId: string): PipelineJob[] {
  const ids = new Set(
    jobEdges(pipeline)
      .filter((edge) => edge.from === jobId)
      .map((edge) => edge.to),
  );

  return pipeline.jobs.filter((job) => ids.has(job.id));
}
