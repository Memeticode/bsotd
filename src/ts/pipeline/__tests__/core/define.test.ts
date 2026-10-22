import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DatasetKind,
  definePipeline,
  type ExternalDataset,
} from "../../src/core/index.ts";
import { pipelineOf, step, table } from "../helpers.ts";

const raw = table("raw");

test("accepts steps declared after the steps they read from", () => {
  const pipeline = pipelineOf(
    step("load", { outputs: [raw] }),
    step("clean", { inputs: [raw] }),
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
    definePipeline(pipelineOf(step("load", { inputs: [api] }))),
  );
});

test("rejects duplicate step ids", () => {
  assert.throws(
    () => definePipeline(pipelineOf(step("load"), step("load"))),
    /Duplicate step id "load"/,
  );
});

test("rejects steps without transformations", () => {
  assert.throws(
    () => definePipeline(pipelineOf(step("load", { transformations: [] }))),
    /"load" has no transformations/,
  );
});

test("rejects inputs that no earlier step outputs", () => {
  assert.throws(
    () =>
      definePipeline(
        pipelineOf(
          step("clean", { inputs: [raw] }),
          step("load", { outputs: [raw] }),
        ),
      ),
    /"clean" reads "raw", which no earlier step outputs/,
  );
});

test("rejects datasets output by more than one step", () => {
  assert.throws(
    () =>
      definePipeline(
        pipelineOf(
          step("load", { outputs: [raw] }),
          step("reload", { outputs: [raw] }),
        ),
      ),
    /"raw" is output by both "load" and "reload"/,
  );
});
