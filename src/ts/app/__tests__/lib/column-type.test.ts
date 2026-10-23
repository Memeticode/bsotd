import assert from "node:assert/strict";
import { test } from "node:test";

import { ColumnType, columnType } from "../../src/lib/column-type.ts";

test("PostgreSQL types map to how their values are shown", () => {
  const cases: [string, string, ColumnType][] = [
    ["bigint", "int8", ColumnType.Number],
    ["double precision", "float8", ColumnType.Number],
    ["date", "date", ColumnType.Date],
    ["timestamp with time zone", "timestamptz", ColumnType.Timestamp],
    ["jsonb", "jsonb", ColumnType.Json],
    ["ARRAY", "_text", ColumnType.List],
    ["text", "text", ColumnType.Text],
    ["boolean", "bool", ColumnType.Text],
  ];

  for (const [dataType, udtName, expected] of cases) {
    assert.equal(columnType(dataType, udtName), expected, dataType);
  }
});

test("pgvector types are recognised by their type name", () => {
  assert.equal(columnType("USER-DEFINED", "vector"), ColumnType.Vector);
  assert.equal(columnType("USER-DEFINED", "sparsevec"), ColumnType.SparseVector);
  assert.equal(columnType("USER-DEFINED", "citext"), ColumnType.Text);
});
