import assert from "node:assert/strict";
import { test } from "node:test";

import { ColumnType } from "../../src/lib/column-type.ts";
import { formatValue } from "../../src/lib/format-value.ts";

test("null and undefined read as null", () => {
  assert.equal(formatValue(null), "null");
  assert.equal(formatValue(undefined, ColumnType.Number), "null");
});

test("timestamps are shown in UTC to the minute", () => {
  const value = new Date("2026-10-21T09:55:30Z");

  assert.equal(formatValue(value, ColumnType.Timestamp), "2026-10-21 09:55 UTC");
});

test("whole numbers stay whole and fractions get three decimals", () => {
  assert.equal(formatValue(4, ColumnType.Number), "4");
  assert.equal(formatValue(0.81049, ColumnType.Number), "0.810");
});

test("lists are joined with commas", () => {
  assert.equal(formatValue(["WMUR", "WESH"], ColumnType.List), "WMUR, WESH");
});

test("long JSON is truncated", () => {
  const formatted = formatValue({ text: "x".repeat(500) }, ColumnType.Json);

  assert.equal(formatted.length, 240);
  assert.ok(formatted.endsWith("…"));
});

test("vectors show their size and first values", () => {
  assert.equal(
    formatValue("[0.1,-0.25,0.3333,0.4]", ColumnType.Vector),
    "4 dims [0.100, -0.250, 0.333, …]",
  );
});

test("sparse vectors show how many values are non-zero", () => {
  assert.equal(
    formatValue("{1:0.5,3:0.2}/1000", ColumnType.SparseVector),
    "2 of 1000 non-zero",
  );
  assert.equal(
    formatValue("{}/1000", ColumnType.SparseVector),
    "0 of 1000 non-zero",
  );
});
