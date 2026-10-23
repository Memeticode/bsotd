import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DatasetKind,
  SortDirection,
  type RelationDataset,
} from "@bsotd/pipeline/core";

import {
  countQuery,
  previewQuery,
  quoteIdentifier,
  splitRelation,
} from "../../src/lib/preview-query.ts";

const view: RelationDataset = {
  kind: DatasetKind.View,
  name: "news.v_gnews_article",
  description: "",
};

test("previews order by the first column, newest first, by default", () => {
  assert.equal(
    previewQuery(view),
    'SELECT * FROM "news"."v_gnews_article" ORDER BY 1 DESC LIMIT $1 OFFSET $2',
  );
});

test("previews follow a dataset's sortBy when it has one", () => {
  const sorted: RelationDataset = {
    ...view,
    sortBy: [
      { column: "published_at", direction: SortDirection.Descending },
      { column: "id", direction: SortDirection.Ascending },
    ],
  };

  assert.equal(
    previewQuery(sorted),
    'SELECT * FROM "news"."v_gnews_article" ORDER BY "published_at" DESC, "id" ASC LIMIT $1 OFFSET $2',
  );
});

test("counts cover the whole relation", () => {
  assert.equal(
    countQuery(view),
    'SELECT count(*)::int AS total FROM "news"."v_gnews_article"',
  );
});

test("relation names split into schema and relation", () => {
  assert.deepEqual(splitRelation("news.v_gnews_article"), {
    schema: "news",
    relation: "v_gnews_article",
  });
  assert.deepEqual(splitRelation("articles"), {
    schema: "public",
    relation: "articles",
  });
});

test("quotes inside identifiers are escaped", () => {
  assert.equal(quoteIdentifier('odd"name'), '"odd""name"');
});
