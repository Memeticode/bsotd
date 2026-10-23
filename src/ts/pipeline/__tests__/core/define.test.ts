import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DatasetKind,
  definePipeline,
  type ExternalDataset,
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

// Code writes raw, then a SQL step turns it into clean, the job's output.
const loadThenClean = pipelineJob("load", {
  steps: [codeStep([raw]), sqlStep(clean)],
});

test("accepts jobs declared after the jobs they read from", () => {
  const pipeline = pipelineOf(
    loadThenClean,
    pipelineJob("report", { inputs: [clean] }),
  );

  assert.equal(definePipeline(pipeline), pipeline);
});

test("accepts external inputs", () => {
  const api: ExternalDataset = {
    kind: DatasetKind.External,
    name: "api",
    description: "",
    url: "https://example.com",
  };

  assert.doesNotThrow(() =>
    definePipeline(pipelineOf(pipelineJob("load", { inputs: [api] }))),
  );
});

test("accepts editorial inputs, which no job produces", () => {
  const corrections = { ...table("corrections"), editorial: true };

  assert.doesNotThrow(() =>
    definePipeline(
      pipelineOf(
        loadThenClean,
        pipelineJob("report", { inputs: [clean, corrections] }),
      ),
    ),
  );
});

test("rejects jobs that produce editorial data", () => {
  const corrections = { ...table("corrections"), editorial: true };

  assert.throws(
    () =>
      definePipeline(
        pipelineOf(pipelineJob("load", { steps: [codeStep([corrections])] })),
      ),
    /Job "load" produces "corrections", which editors write/,
  );
});

test("rejects duplicate job ids", () => {
  assert.throws(
    () => definePipeline(pipelineOf(pipelineJob("load"), pipelineJob("load"))),
    /Duplicate job id "load"/,
  );
});

test("rejects jobs without steps", () => {
  assert.throws(
    () => definePipeline(pipelineOf(pipelineJob("load", { steps: [] }))),
    /Job "load" has no steps/,
  );
});

test("rejects inputs that no earlier job outputs", () => {
  assert.throws(
    () =>
      definePipeline(
        pipelineOf(pipelineJob("report", { inputs: [clean] }), loadThenClean),
      ),
    /Job "report" reads "clean", which no earlier job outputs/,
  );
});

test("jobs can't read another job's intermediate data", () => {
  assert.throws(
    () =>
      definePipeline(
        pipelineOf(loadThenClean, pipelineJob("report", { inputs: [raw] })),
      ),
    /Job "report" reads "raw", which no earlier job outputs/,
  );
});

test("rejects data produced by more than one job", () => {
  assert.throws(
    () =>
      definePipeline(
        pipelineOf(
          loadThenClean,
          pipelineJob("reload", { steps: [codeStep([raw])] }),
        ),
      ),
    /"raw" is produced twice: by "load" and by "reload"/,
  );
});
