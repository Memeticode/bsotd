import assert from "node:assert/strict";
import { test } from "node:test";

import { Status, stepStatus } from "../../src/core/index.ts";
import { step } from "../helpers.ts";

function stepWith(...statuses: Status[]) {
  return step("step", {
    transformations: statuses.map((status, i) => ({
      name: `transform ${i}`,
      description: "",
      status,
    })),
  });
}

test("a step has its transformations' status when they all agree", () => {
  const implemented = stepWith(Status.Implemented, Status.Implemented);
  const todo = stepWith(Status.Todo, Status.Todo);

  assert.equal(stepStatus(implemented), Status.Implemented);
  assert.equal(stepStatus(todo), Status.Todo);
});

test("a step with mixed transformations is in progress", () => {
  const mixed = stepWith(Status.Implemented, Status.Todo);

  assert.equal(stepStatus(mixed), Status.InProgress);
});
