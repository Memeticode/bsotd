import assert from "node:assert/strict";
import { test } from "node:test";

import {
  OWN_STORY,
  parseAnalysisReview,
  parseMoveArticle,
  parseRelevanceOverride,
  parseStoryId,
} from "../../src/lib/editorial-input.ts";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();

  for (const [name, value] of Object.entries(fields)) {
    data.append(name, value);
  }

  return data;
}

test("an article can move to another story or into one of its own", () => {
  const fields = { articleId: "33", storyId: "23" };

  assert.deepEqual(
    parseMoveArticle(form({ ...fields, target: "25", note: " Other launch " })),
    {
      ok: true,
      value: {
        articleId: "33",
        fromStoryId: "23",
        toStoryId: "25",
        note: "Other launch",
      },
    },
  );
  assert.deepEqual(
    parseMoveArticle(form({ ...fields, target: OWN_STORY })),
    {
      ok: true,
      value: { articleId: "33", fromStoryId: "23", toStoryId: null, note: null },
    },
  );
});

test("moves need a real destination", () => {
  for (const target of ["", "abc", "23", "0"]) {
    const parsed = parseMoveArticle(
      form({ articleId: "33", storyId: "23", target }),
    );
    assert.equal(parsed.ok, false, `target "${target}"`);
  }
});

test("IDs must be positive whole numbers", () => {
  const invalid = ["", "-1", "1.5", "1e3", "12345678901234567890", "1 OR 1=1"];

  for (const storyId of invalid) {
    assert.equal(parseStoryId(form({ storyId })).ok, false, `story "${storyId}"`);
  }

  assert.deepEqual(parseStoryId(form({ storyId: "42" })), { ok: true, value: "42" });
});

test("editors mark a story relevant or not", () => {
  const fields = { storyId: "7" };

  assert.deepEqual(
    parseRelevanceOverride(form({ ...fields, relevant: "false", note: " Minor " })),
    { ok: true, value: { storyId: "7", isRelevant: false, note: "Minor" } },
  );
  assert.deepEqual(parseRelevanceOverride(form({ ...fields, relevant: "true" })), {
    ok: true,
    value: { storyId: "7", isRelevant: true, note: null },
  });

  for (const relevant of ["", "yes", "1"]) {
    assert.equal(
      parseRelevanceOverride(form({ ...fields, relevant })).ok,
      false,
      `relevant "${relevant}"`,
    );
  }
});

test("reviews approve or reject, with notes kept short", () => {
  const fields = { storyId: "7", analysisId: "3" };
  const longNote = "x".repeat(1001);

  assert.equal(parseAnalysisReview(form({ ...fields, verdict: "approved" })).ok, true);
  assert.equal(parseAnalysisReview(form({ ...fields, verdict: "rejected" })).ok, true);
  assert.equal(parseAnalysisReview(form({ ...fields, verdict: "maybe" })).ok, false);
  assert.equal(
    parseAnalysisReview(form({ ...fields, verdict: "approved", note: longNote })).ok,
    false,
  );
});
