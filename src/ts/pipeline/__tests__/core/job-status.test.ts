import assert from "node:assert/strict";
import { test } from "node:test";

import { jobStatus, Status } from "../../src/core/index.ts";
import { pipelineJob, sqlStep, table } from "../helpers.ts";

function jobWith(...statuses: Status[]) {
  return pipelineJob("job", {
    steps: statuses.map((status, i) => sqlStep(table(`view_${i}`), { status })),
  });
}

test("a job has its steps' status when they all agree", () => {
  const implemented = jobWith(Status.Implemented, Status.Implemented);
  const todo = jobWith(Status.Todo, Status.Todo);

  assert.equal(jobStatus(implemented), Status.Implemented);
  assert.equal(jobStatus(todo), Status.Todo);
});

test("a job with mixed statuses is in progress", () => {
  const mixed = jobWith(Status.Todo, Status.Implemented);

  assert.equal(jobStatus(mixed), Status.InProgress);
});
