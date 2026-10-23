import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Agreement,
  ReviewVerdict,
  adjacentDays,
  categoryLabel,
  count,
  dayHref,
  formatDay,
  formatMoment,
  groupClaims,
  listOutlets,
  scoreLabel,
  storyTitle,
} from "../../src/lib/story-display.ts";

test("claims are grouped with disputed ones first, keeping their order", () => {
  const claims = [
    { id: 1, agreement: Agreement.SingleSource },
    { id: 2, agreement: Agreement.Corroborated },
    { id: 3, agreement: Agreement.Disputed },
    { id: 4, agreement: Agreement.Corroborated },
  ];

  assert.deepEqual(
    groupClaims(claims).map((group) => [group.agreement, group.claims.map((c) => c.id)]),
    [
      [Agreement.Disputed, [3]],
      [Agreement.Corroborated, [2, 4]],
      [Agreement.SingleSource, [1]],
    ],
  );
});

test("a story goes by its analysis's headline unless an editor rejected it", () => {
  const story = { headline: "Neutral headline", leadTitle: "Lead title" };

  assert.equal(storyTitle({ ...story, reviewVerdict: null }), "Neutral headline");
  assert.equal(
    storyTitle({ ...story, reviewVerdict: ReviewVerdict.Approved }),
    "Neutral headline",
  );
  assert.equal(
    storyTitle({ ...story, reviewVerdict: ReviewVerdict.Rejected }),
    "Lead title",
  );
  assert.equal(
    storyTitle({ headline: null, leadTitle: null, reviewVerdict: null }),
    "Untitled story",
  );
});

test("outlets are listed in full until naming them takes more room", () => {
  assert.equal(listOutlets([]), "");
  assert.equal(listOutlets(["CNN"]), "CNN");
  assert.equal(listOutlets(["CNN", "WMUR"]), "CNN and WMUR");
  assert.equal(listOutlets(["A", "B", "C", "D"]), "A, B, C and D");
  assert.equal(listOutlets(["A", "B", "C", "D", "E"]), "A, B, C and 2 more");
});

test("counts agree with their nouns", () => {
  assert.equal(count(1, "story", "stories"), "1 story");
  assert.equal(count(2, "story", "stories"), "2 stories");
  assert.equal(count(1200, "article"), "1,200 articles");
});

test("scores are named on their scale", () => {
  assert.equal(scoreLabel(["Low", "High"], 2), "High (2/5)");
});

test("days are shown in UTC", () => {
  assert.equal(formatDay("2026-10-21"), "Wednesday, October 21, 2026");
  assert.equal(formatMoment(new Date("2026-10-22T18:24:59Z")), "Oct 22, 18:24 UTC");
});

test("the days around a day are found within its category", () => {
  const days = [
    { category: "science", publishedDate: "2026-10-21" },
    { category: "health", publishedDate: "2026-10-20" },
    { category: "science", publishedDate: "2026-10-19" },
    { category: "science", publishedDate: "2026-10-16" },
  ];

  assert.deepEqual(adjacentDays(days, "science", "2026-10-19"), {
    previous: "2026-10-16",
    next: "2026-10-21",
  });
  assert.deepEqual(adjacentDays(days, "science", "2026-10-21"), {
    previous: "2026-10-19",
    next: undefined,
  });
});

test("feed addresses carry the category and day", () => {
  assert.equal(dayHref("science", "2026-10-21"), "/?category=science&date=2026-10-21");
  assert.equal(categoryLabel("science"), "Science");
});
