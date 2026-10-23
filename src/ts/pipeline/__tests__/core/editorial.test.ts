import assert from "node:assert/strict";
import { test } from "node:test";

import { DatasetKind, isEditorial } from "../../src/core/index.ts";
import { table } from "../helpers.ts";

test("tables and views are editorial only when marked so", () => {
  assert.equal(isEditorial({ ...table("corrections"), editorial: true }), true);
  assert.equal(isEditorial(table("articles")), false);
  assert.equal(
    isEditorial({
      kind: DatasetKind.External,
      name: "api",
      description: "",
      url: "https://example.com",
    }),
    false,
  );
});
