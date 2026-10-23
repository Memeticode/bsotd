import assert from "node:assert/strict";
import { test } from "node:test";

import { jobKind, PipelineJobStepKind } from "../../src/core/index.ts";
import { codeStep, pipelineJob, sqlStep, table } from "../helpers.ts";

test("a job has the kind of its step that runs code", () => {
  const job = pipelineJob("embed", {
    steps: [
      sqlStep(table("daily_articles")),
      codeStep([table("vectors")], { kind: PipelineJobStepKind.Model }),
      sqlStep(table("joined")),
    ],
  });

  assert.equal(jobKind(job), PipelineJobStepKind.Model);
});

test("a job with only SQL steps is SQL", () => {
  const job = pipelineJob("views", {
    steps: [sqlStep(table("a")), sqlStep(table("b"))],
  });

  assert.equal(jobKind(job), PipelineJobStepKind.Sql);
});
