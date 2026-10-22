import assert from "node:assert/strict";
import { test } from "node:test";

import {
  datasetProducer,
  downstreamSteps,
  stepEdges,
  upstreamSteps,
} from "../../src/core/index.ts";
import { pipelineOf, step, table } from "../helpers.ts";

const raw = table("raw");
const clean = table("clean");
const stats = table("stats");

const pipeline = pipelineOf(
  step("load", { outputs: [raw] }),
  step("clean", { inputs: [raw], outputs: [clean, stats] }),
  step("report", { inputs: [clean, stats] }),
);

test("stepEdges gives one edge per pair of connected steps", () => {
  assert.deepEqual(stepEdges(pipeline), [
    { from: "load", to: "clean", datasets: ["raw"] },
    { from: "clean", to: "report", datasets: ["clean", "stats"] },
  ]);
});

test("upstreamSteps and downstreamSteps follow the edges", () => {
  const ids = (steps: { id: string }[]) => steps.map((s) => s.id);

  assert.deepEqual(ids(upstreamSteps(pipeline, "clean")), ["load"]);
  assert.deepEqual(ids(downstreamSteps(pipeline, "clean")), ["report"]);
  assert.deepEqual(ids(upstreamSteps(pipeline, "load")), []);
});

test("datasetProducer finds the step that outputs a dataset", () => {
  assert.equal(datasetProducer(pipeline, "stats")?.id, "clean");
  assert.equal(datasetProducer(pipeline, "missing"), undefined);
});
