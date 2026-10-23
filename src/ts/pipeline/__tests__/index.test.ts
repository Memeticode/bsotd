import assert from "node:assert/strict";
import { test } from "node:test";

import { upstreamJobs } from "../src/core/index.ts";
import { jobsPipeline } from "../src/index.ts";

// Importing the pipeline runs definePipeline, so a broken definition
// fails here before anything else does.
test("ingestion is the only job that reads from outside the pipeline", () => {
  const sources = jobsPipeline.jobs.filter(
    (job) => upstreamJobs(jobsPipeline, job.id).length === 0,
  );

  assert.deepEqual(
    sources.map((job) => job.id),
    ["gnews-ingestion"],
  );
});
