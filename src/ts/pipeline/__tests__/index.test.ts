import assert from "node:assert/strict";
import { test } from "node:test";

import { upstreamSteps } from "../src/core/index.ts";
import { newsPipeline } from "../src/index.ts";

// Importing the pipeline runs definePipeline, so a broken definition
// fails here before anything else does.
test("ingestion is the only step that reads from outside the pipeline", () => {
  const sources = newsPipeline.steps.filter(
    (step) => upstreamSteps(newsPipeline, step.id).length === 0,
  );

  assert.deepEqual(
    sources.map((step) => step.id),
    ["gnews-ingestion"],
  );
});
