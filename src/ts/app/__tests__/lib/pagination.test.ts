import assert from "node:assert/strict";
import { test } from "node:test";

import { pageHref, pageNumber } from "../../src/lib/pagination.ts";

test("page numbers default to 1", () => {
  assert.equal(pageNumber({}, "news.a"), 1);

  for (const value of ["0", "-2", "2.5", "abc", ""]) {
    assert.equal(pageNumber({ "news.a": value }, "news.a"), 1, value);
  }
});

test("page numbers are read from the table's key", () => {
  assert.equal(pageNumber({ "news.a": "3" }, "news.a"), 3);
  assert.equal(pageNumber({ "news.a": ["4", "5"] }, "news.a"), 4);
});

test("links change one table's page and keep the others", () => {
  const paging = {
    path: "/pipeline/step",
    params: { "news.a": "2", "news.b": "5" },
  };

  assert.equal(
    pageHref(paging, "news.a", 3),
    "/pipeline/step?news.b=5&news.a=3",
  );
});

test("page 1 is left out of the link", () => {
  const paging = { path: "/pipeline/step", params: { "news.a": "2" } };

  assert.equal(pageHref(paging, "news.a", 1), "/pipeline/step");
});
