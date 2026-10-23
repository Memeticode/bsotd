import assert from "node:assert/strict";
import { test } from "node:test";

import {
  datasetProducer,
  downstreamJobs,
  jobEdges,
  jobOutputs,
  upstreamJobs,
} from "../../src/core/index.ts";
import {
  codeStep,
  pipelineJob,
  pipelineOf,
  sqlStep,
  table,
} from "../helpers.ts";

const raw = table("raw");
const clean = table("clean");
const stats = table("stats");

const pipeline = pipelineOf(
  pipelineJob("load", { steps: [codeStep([raw])] }),
  pipelineJob("clean", { inputs: [raw], steps: [codeStep([clean, stats])] }),
  pipelineJob("report", { inputs: [clean, stats] }),
);

test("a job outputs what its last step produces", () => {
  const job = pipelineJob("load", { steps: [codeStep([raw]), sqlStep(clean)] });

  assert.deepEqual(
    jobOutputs(job).map((dataset) => dataset.name),
    ["clean"],
  );
});

test("jobEdges gives one edge per pair of connected jobs", () => {
  assert.deepEqual(jobEdges(pipeline), [
    { from: "load", to: "clean", datasets: ["raw"] },
    { from: "clean", to: "report", datasets: ["clean", "stats"] },
  ]);
});

test("upstreamJobs and downstreamJobs follow the edges", () => {
  const ids = (jobs: { id: string }[]) => jobs.map((job) => job.id);

  assert.deepEqual(ids(upstreamJobs(pipeline, "clean")), ["load"]);
  assert.deepEqual(ids(downstreamJobs(pipeline, "clean")), ["report"]);
  assert.deepEqual(ids(upstreamJobs(pipeline, "load")), []);
});

test("datasetProducer finds the job that outputs a dataset", () => {
  assert.equal(datasetProducer(pipeline, "stats")?.id, "clean");
  assert.equal(datasetProducer(pipeline, "missing"), undefined);
});
