import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Agreement,
  ReviewVerdict,
  Stance,
  adjacentDays,
  categoryLabel,
  chooseDay,
  citationCounts,
  count,
  countReports,
  dayHref,
  formatDay,
  filterClaims,
  formatMoment,
  groupClaims,
  labelSources,
  listOutlets,
  stancesOf,
  storyTitle,
  toggleOption,
  webUrl,
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
  // A single source's story keeps that source's headline.
  assert.equal(storyTitle({ ...story, reviewVerdict: null }, true), "Lead title");
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

test("an outlet's second copy of a story is numbered", () => {
  const sources = [
    { name: "CNN", url: "https://cnn.com/a" },
    { name: "KOCO", url: null },
    { name: "CNN", url: "https://cnn.com/b" },
  ];

  assert.deepEqual(
    labelSources(sources).map((source) => source.label),
    ["CNN", "KOCO", "CNN (2)"],
  );
});

test("only web addresses become links", () => {
  assert.equal(webUrl("https://www.cnn.com/a?b=c"), "https://www.cnn.com/a?b=c");
  assert.equal(webUrl("http://example.com"), "http://example.com");
  assert.equal(webUrl("javascript:alert(1)"), null);
  assert.equal(webUrl("not a url"), null);
  assert.equal(webUrl(""), null);
  assert.equal(webUrl(null), null);
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


// Supported by articles 1 and 2, copies of one report, and by 3;
// contradicted by 4; not mentioned by 5.
const claim = {
  agreement: Agreement.Disputed,
  supportingReports: 2,
  contradictingReports: 1,
  sources: [
    { articleId: "1", stance: Stance.Supports },
    { articleId: "2", stance: Stance.Supports },
    { articleId: "3", stance: Stance.Supports },
    { articleId: "4", stance: Stance.Contradicts },
  ],
  notMentionedArticleIds: ["5"],
  reportIds: { "1": "1", "2": "1", "3": "3", "4": "4" },
};

test("claims rest on as many reports as they cite, copies counted once", () => {
  const copies = {
    ...claim,
    sources: [
      { articleId: "1", stance: Stance.Supports },
      { articleId: "2", stance: Stance.Supports },
    ],
  };

  // 1 and 2 are copies of one report; 3 and 4 are reports of their own.
  assert.equal(countReports([claim]), 3);
  assert.equal(countReports([copies, copies]), 1);
  assert.equal(countReports([]), 0);
});

test("the first pick narrows to it, later picks add, picking again removes", () => {
  const none = new Set<string>();
  const cnn = toggleOption(none, "CNN");
  const both = toggleOption(cnn, "WSTM");

  assert.deepEqual([...cnn], ["CNN"]);
  assert.deepEqual([...both], ["CNN", "WSTM"]);
  assert.deepEqual([...toggleOption(both, "CNN")], ["WSTM"]);
  assert.deepEqual([...toggleOption(cnn, "CNN")], []);
  // The selection given is left as it was.
  assert.deepEqual([...cnn], ["CNN"]);
});

// Outlets behind the claim's articles: 1 and 2 are syndicated copies.
const outletOf = (id: string) =>
  ({ "1": "WMUR", "2": "KOCO", "3": "CNN", "4": "WSTM", "5": "Globe" })[id] ?? "";

const onlyCnn = {
  ...claim,
  agreement: Agreement.SingleSource,
  supportingReports: 1,
  contradictingReports: 0,
  sources: [{ articleId: "3", stance: Stance.Supports }],
};

test("with nothing chosen, every claim shows", () => {
  const { bySource, shown } = filterClaims([claim, onlyCnn], outletOf, new Set(), new Set());

  assert.deepEqual(bySource, [claim, onlyCnn]);
  assert.deepEqual(shown, [claim, onlyCnn]);
});

test("one outlet's claims keep the status every source gives them", () => {
  const { shown } = filterClaims([claim, onlyCnn], outletOf, new Set(["CNN"]), new Set());

  assert.deepEqual(shown, [claim, onlyCnn]);
  assert.equal(shown[0]?.agreement, Agreement.Disputed);
});

test("an outlet's contradictions count as addressing a claim", () => {
  assert.deepEqual(
    filterClaims([claim, onlyCnn], outletOf, new Set(["WSTM"]), new Set()).shown,
    [claim],
  );
});

test("claims no chosen outlet reports or contradicts drop out", () => {
  assert.deepEqual(
    filterClaims([claim], outletOf, new Set(["Globe"]), new Set()).shown,
    [],
  );
});

test("statuses narrow the chosen outlets' claims", () => {
  const { bySource, shown } = filterClaims(
    [claim, onlyCnn],
    outletOf,
    new Set(["CNN"]),
    new Set([Agreement.SingleSource]),
  );

  assert.equal(bySource.length, 2);
  // What only CNN reports.
  assert.deepEqual(shown, [onlyCnn]);
});

test("chosen outlets' stances on a claim are set side by side", () => {
  assert.deepEqual(stancesOf(claim, outletOf, ["CNN", "WSTM", "Globe"]), {
    reports: ["CNN"],
    contradicts: ["WSTM"],
    silent: ["Globe"],
  });
});

test("outlets are counted once per claim they're behind, most first", () => {
  const second = { ...claim, sources: [{ articleId: "3", stance: Stance.Supports }] };

  assert.deepEqual(citationCounts([claim, second], outletOf), [
    ["CNN", 2],
    ["KOCO", 1],
    ["WMUR", 1],
    ["WSTM", 1],
  ]);
});

test("a day view shows the day asked for, or else the category's latest", () => {
  const days = [
    { category: "science", publishedDate: "2026-10-22" },
    { category: "nation", publishedDate: "2026-10-21" },
    { category: "science", publishedDate: "2026-10-21" },
  ];

  assert.deepEqual(chooseDay(days, "science", "2026-10-21"), {
    categories: [
      { category: "science", latestDay: "2026-10-22" },
      { category: "nation", latestDay: "2026-10-21" },
    ],
    category: "science",
    day: "2026-10-21",
    missingDay: undefined,
  });
  assert.equal(chooseDay(days, "nation", "2026-10-22")?.missingDay, "2026-10-22");
  assert.equal(chooseDay(days, "sports", undefined)?.category, "science");
  assert.equal(chooseDay([], undefined, undefined), undefined);
});

test("day links go to the Stories page unless another view is given", () => {
  assert.equal(dayHref("science", "2026-10-21"), "/?category=science&date=2026-10-21");
  assert.equal(
    dayHref("science", "2026-10-21", "/editor"),
    "/editor?category=science&date=2026-10-21",
  );
});
