import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ColumnType,
  DatasetKind,
  SortDirection,
  type RelationDataset,
} from "@bsotd/pipeline/core";

import {
  countQuery,
  previewQuery,
  quoteIdentifier,
} from "../../src/lib/preview-query.ts";

const dataset: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article",
  description: "",
  columns: [
    { name: "id" },
    { name: "published_at", type: ColumnType.Timestamp },
  ],
  sortBy: [
    { column: "published_at", direction: SortDirection.Descending },
    { column: "id", direction: SortDirection.Ascending },
  ],
};

test("previews select the declared columns in the declared order", () => {
  assert.equal(
    previewQuery(dataset),
    'SELECT "id", "published_at" FROM "news"."v_gnews_article" ORDER BY "published_at" DESC, "id" ASC LIMIT $1',
  );
});

test("previews without a sort order have no ORDER BY", () => {
  assert.equal(
    previewQuery({ ...dataset, sortBy: [] }),
    'SELECT "id", "published_at" FROM "news"."v_gnews_article" LIMIT $1',
  );
});

test("counts cover the whole relation", () => {
  assert.equal(
    countQuery(dataset),
    'SELECT count(*)::int AS total FROM "news"."v_gnews_article"',
  );
});

test("quotes inside identifiers are escaped", () => {
  assert.equal(quoteIdentifier('odd"name'), '"odd""name"');
});
