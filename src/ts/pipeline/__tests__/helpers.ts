import {
  DatasetKind,
  PipelineJobStepKind,
  Status,
  type OutputDataset,
  type Pipeline,
  type PipelineJob,
  type PipelineJobStep,
  type RelationDataset,
} from "../src/core/index.ts";

export function table(name: string): RelationDataset {
  return { kind: DatasetKind.Table, name, description: "" };
}

/** A step that runs Python and produces the given data. */
export function codeStep(
  produces: OutputDataset[],
  overrides: Partial<PipelineJobStep> = {},
): PipelineJobStep {
  return {
    kind: PipelineJobStepKind.Model,
    name: "run",
    description: "",
    status: Status.Implemented,
    produces,
    ...overrides,
  };
}

/** A SQL step that produces one view or table. */
export function sqlStep(
  produces: RelationDataset,
  overrides: Partial<PipelineJobStep> = {},
): PipelineJobStep {
  return {
    kind: PipelineJobStepKind.Sql,
    name: produces.name,
    description: "",
    status: Status.Implemented,
    produces: [produces],
    ...overrides,
  };
}

/** A job; by default a single code step that produces nothing. */
export function pipelineJob(
  id: string,
  overrides: Partial<PipelineJob> = {},
): PipelineJob {
  return {
    id,
    name: id,
    summary: "",
    inputs: [],
    steps: [codeStep([])],
    ...overrides,
  };
}

export function pipelineOf(...jobs: PipelineJob[]): Pipeline {
  return { name: "test", description: "", jobs };
}
