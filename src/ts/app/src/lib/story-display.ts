// How stories and their analyses are described on the story pages. Nothing
// here touches the database or Next.js, so plain Node can test it.

/** How a claim's sources line up, as v_gnews_story_claim decides. */
export const Agreement = {
  Disputed: "disputed",
  Corroborated: "corroborated",
  SingleSource: "single source",
  Unsupported: "unsupported",
} as const;

export type Agreement = (typeof Agreement)[keyof typeof Agreement];

export const ClaimKind = {
  Fact: "fact",
  Interpretation: "interpretation",
} as const;

export type ClaimKind = (typeof ClaimKind)[keyof typeof ClaimKind];

/** How an article bears on a claim. */
export const Stance = {
  Supports: "supports",
  Contradicts: "contradicts",
} as const;

export type Stance = (typeof Stance)[keyof typeof Stance];

/** An editor's verdict on an analysis. */
export const ReviewVerdict = {
  Approved: "approved",
  Rejected: "rejected",
} as const;

export type ReviewVerdict = (typeof ReviewVerdict)[keyof typeof ReviewVerdict];

export const AGREEMENT_LABELS: Record<Agreement, string> = {
  [Agreement.Disputed]: "Disputed",
  [Agreement.Corroborated]: "Corroborated",
  [Agreement.SingleSource]: "Single source",
  [Agreement.Unsupported]: "Unsupported",
};

/** What each group of claims means, for readers. */
export const AGREEMENT_DESCRIPTIONS: Record<Agreement, string> = {
  [Agreement.Disputed]: "At least one source reports something incompatible.",
  [Agreement.Corroborated]: "Reported by two or more independent sources.",
  [Agreement.SingleSource]: "Reported by one source only.",
  [Agreement.Unsupported]: "No source still supports it.",
};

export const CLAIM_KIND_LABELS: Record<ClaimKind, string> = {
  [ClaimKind.Fact]: "Fact",
  [ClaimKind.Interpretation]: "Interpretation",
};

/** An outlet's copy of an article, and where to read it. */
export interface Source {
  name: string;
  url: string | null;
}

/**
 * The address, if it's a web page's: links come from the outlets' feeds,
 * so nothing else, such as a javascript: URL, becomes a link.
 */
export function webUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Sources labeled by outlet for listing side by side. An outlet with more
 * than one copy numbers the rest, e.g. "CNN", "CNN (2)".
 */
export function labelSources<S extends Source>(sources: S[]): (S & { label: string })[] {
  const seen = new Map<string, number>();

  return sources.map((source) => {
    const copy = (seen.get(source.name) ?? 0) + 1;
    seen.set(source.name, copy);
    return { ...source, label: copy === 1 ? source.name : `${source.name} (${copy})` };
  });
}

/** What a claim's status depends on, as v_gnews_story_claim gives it. */
interface SourcedClaim {
  agreement: Agreement;
  supportingReports: number;
  contradictingReports: number;
  sources: { articleId: string; stance: Stance }[];
  notMentionedArticleIds: string[];
  /** Article ID -> its report's ID: syndicated copies share one. */
  reportIds: Record<string, string>;
}

/** Where each of some outlets stands on a claim, for comparing them. */
export interface OutletStances {
  reports: string[];
  contradicts: string[];
  /** Outlets that neither report nor contradict it. */
  silent: string[];
}

/**
 * Where each of the given outlets stands on a claim, in the order given. An
 * outlet with articles on both sides is listed on both.
 */
export function stancesOf(
  claim: SourcedClaim,
  outletOf: (articleId: string) => string,
  outlets: Iterable<string>,
): OutletStances {
  const taking = (stance: Stance) =>
    new Set(
      claim.sources
        .filter((source) => source.stance === stance)
        .map((source) => outletOf(source.articleId)),
    );
  const reporting = taking(Stance.Supports);
  const contradicting = taking(Stance.Contradicts);
  const all = [...outlets];

  return {
    reports: all.filter((outlet) => reporting.has(outlet)),
    contradicts: all.filter((outlet) => contradicting.has(outlet)),
    silent: all.filter((outlet) => !reporting.has(outlet) && !contradicting.has(outlet)),
  };
}

/**
 * How many independent reports a story's claims rest on, counting copies of
 * one report once. With one, there's nothing to compare: every claim is
 * that one source's.
 */
export function countReports(claims: SourcedClaim[]): number {
  return new Set(
    claims.flatMap((claim) =>
      claim.sources.map((source) => claim.reportIds[source.articleId] ?? source.articleId),
    ),
  ).size;
}

/**
 * Whether a story rests on a single source: one article, or claims that all
 * come from copies of one report.
 */
export function isSingleSource(articleCount: number, claims: SourcedClaim[]): boolean {
  return articleCount === 1 || (claims.length > 0 && countReports(claims) <= 1);
}

/** Disputed claims first: disagreement is what readers most need to see. */
export function groupClaims<Claim extends { agreement: Agreement }>(
  claims: Claim[],
): { agreement: Agreement; claims: Claim[] }[] {
  return Object.values(Agreement)
    .map((agreement) => ({
      agreement,
      claims: claims.filter((claim) => claim.agreement === agreement),
    }))
    .filter((group) => group.claims.length > 0);
}

/**
 * The title a story goes by: its analysis's headline, unless an editor
 * rejected the analysis, and otherwise its lead article's title. A single
 * source's story keeps that source's own headline, unchanged: with nothing
 * to weigh it against, there's no call to rewrite it.
 */
export function storyTitle(
  story: {
    headline: string | null;
    reviewVerdict: ReviewVerdict | null;
    leadTitle: string | null;
  },
  singleSource = false,
): string {
  const headline =
    singleSource || story.reviewVerdict === ReviewVerdict.Rejected
      ? null
      : story.headline;

  return headline ?? story.leadTitle ?? "Untitled story";
}

/** The title a story's pages go by, from what they've read of it. */
export function pageTitle(
  story: { leadTitle: string | null; articleCount: number },
  analysis: { headline: string; reviewVerdict: ReviewVerdict | null } | undefined,
  claims: SourcedClaim[],
): string {
  return storyTitle(
    {
      headline: analysis?.headline ?? null,
      reviewVerdict: analysis?.reviewVerdict ?? null,
      leadTitle: story.leadTitle,
    },
    isSingleSource(story.articleCount, claims),
  );
}

/** Story IDs are bigints; anything else in an address can't name a story. */
export function isStoryId(value: string): boolean {
  return /^[1-9]\d{0,18}$/.test(value);
}

/**
 * e.g. "CNN, KOCO and WESH", or "CNN, KOCO, WESH and 2 more" for five.
 * Naming one more outlet never takes more room than "and 1 more".
 */
export function listOutlets(names: string[], shown = 3): string {
  if (names.length <= shown + 1) {
    return names.length <= 1
      ? (names[0] ?? "")
      : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  }

  return `${names.slice(0, shown).join(", ")} and ${names.length - shown} more`;
}

/** e.g. 1 -> "1 article", 3 -> "3 articles" */
export function count(value: number, noun: string, plural = `${noun}s`): string {
  return `${value.toLocaleString("en-US")} ${value === 1 ? noun : plural}`;
}

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** "2026-10-21" -> "Wednesday, October 21, 2026" */
export function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

/** "2026-10-21" -> "Oct 21" */
export function formatShortDay(day: string): string {
  return shortDayFormat.format(new Date(`${day}T00:00:00Z`));
}

/** e.g. 09:55 UTC */
export function formatTime(value: Date): string {
  return `${value.toISOString().slice(11, 16)} UTC`;
}

/** e.g. Oct 22, 18:24 UTC */
export function formatMoment(value: Date): string {
  return `${formatShortDay(value.toISOString().slice(0, 10))}, ${formatTime(value)}`;
}

/** e.g. "science" -> "Science" */
export function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** The days with stories just before and after `day` in one category. */
export function adjacentDays(
  days: { category: string; publishedDate: string }[],
  category: string,
  day: string,
): { previous?: string; next?: string } {
  const dates = days
    .filter((d) => d.category === category)
    .map((d) => d.publishedDate)
    .sort();

  return {
    previous: dates.filter((date) => date < day).at(-1),
    next: dates.find((date) => date > day),
  };
}

/** A day view's address for a category and day: the Stories page's by default. */
export function dayHref(category: string, day: string, base = "/"): string {
  return `${base}?${new URLSearchParams({ category, date: day })}`;
}

/** The category and day a day view shows, from what the address asks for. */
export interface DayChoice {
  /** Every category with stories, and its latest day. */
  categories: { category: string; latestDay: string }[];
  category: string;
  day: string;
  /** A day asked for that has no stories in the category, if any. */
  missingDay?: string;
}

/**
 * Chooses the day to show: the one asked for if it has stories, otherwise
 * the category's latest. An unknown category falls back to the one with the
 * latest stories. Days come latest first; undefined when there are none.
 */
export function chooseDay(
  days: { category: string; publishedDate: string }[],
  requestedCategory: string | undefined,
  requestedDay: string | undefined,
): DayChoice | undefined {
  // Days come latest first, so a category's first day is its latest.
  const latestDays = new Map<string, string>();

  for (const { category, publishedDate } of days) {
    if (!latestDays.has(category)) {
      latestDays.set(category, publishedDate);
    }
  }

  const categories = [...latestDays].map(([category, latestDay]) => ({
    category,
    latestDay,
  }));

  if (categories.length === 0) {
    return undefined;
  }

  const category =
    requestedCategory !== undefined && latestDays.has(requestedCategory)
      ? requestedCategory
      : categories[0]!.category;

  const dayExists = days.some(
    (day) => day.category === category && day.publishedDate === requestedDay,
  );

  return {
    categories,
    category,
    day: dayExists ? requestedDay! : latestDays.get(category)!,
    missingDay: requestedDay !== undefined && !dayExists ? requestedDay : undefined,
  };
}

/**
 * A filter's selection after clicking one of its options: the first pick
 * narrows to it, later picks add to it, and picking a chosen option again
 * takes it away. An empty selection means everything.
 */
export function toggleOption<Option>(
  selection: ReadonlySet<Option>,
  option: Option,
): Set<Option> {
  const next = new Set(selection);

  if (!next.delete(option)) {
    next.add(option);
  }

  return next;
}

/**
 * A story's claims through its filters: those any chosen outlet reports or
 * contradicts, then those of the chosen statuses. Filters only narrow the
 * list: a claim's status always counts every source in the story. An empty
 * choice means all.
 */
export function filterClaims<Claim extends SourcedClaim>(
  claims: Claim[],
  outletOf: (articleId: string) => string,
  outlets: ReadonlySet<string>,
  statuses: ReadonlySet<Agreement>,
): { bySource: Claim[]; shown: Claim[] } {
  const bySource =
    outlets.size === 0
      ? claims
      : claims.filter((claim) =>
          claim.sources.some((source) => outlets.has(outletOf(source.articleId))),
        );

  return {
    bySource,
    shown:
      statuses.size === 0
        ? bySource
        : bySource.filter((claim) => statuses.has(claim.agreement)),
  };
}

/** Every outlet the claims cite, with how many claims each is behind, most first. */
export function citationCounts(
  claims: SourcedClaim[],
  outletOf: (articleId: string) => string,
): [outlet: string, claims: number][] {
  const counts = new Map<string, number>();

  for (const claim of claims) {
    for (const outlet of new Set(claim.sources.map((s) => outletOf(s.articleId)))) {
      counts.set(outlet, (counts.get(outlet) ?? 0) + 1);
    }
  }

  return [...counts].sort(
    ([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b),
  );
}
