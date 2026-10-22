import {
  DatasetKind,
  Status,
  StepKind,
  type Pipeline,
  type PipelineStep,
  type RelationDataset,
} from "../src/core/index.ts";

export function table(name: string): RelationDataset {
  return {
    kind: DatasetKind.Table,
    name,
    description: "",
    columns: [],
    sortBy: [],
  };
}

export function step(
  id: string,
  overrides: Partial<PipelineStep> = {},
): PipelineStep {
  return {
    id,
    kind: StepKind.Sql,
    name: id,
    summary: "",
    inputs: [],
    transformations: [
      { name: "transform", description: "", status: Status.Implemented },
    ],
    outputs: [],
    ...overrides,
  };
}

export function pipelineOf(...steps: PipelineStep[]): Pipeline {
  return { name: "test", description: "", steps };
}
