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

/** The rubric's 1–5 scales, as relevance classification defines them. */
export const IMPORTANCE_LABELS = ["Trivial", "Minor", "Moderate", "Significant", "Major"];
export const CATEGORY_RELEVANCE_LABELS = [
  "Outside it",
  "Mostly outside",
  "Partly in",
  "Clearly in",
  "Squarely in",
];

/** e.g. 4 -> "Significant (4/5)" */
export function scoreLabel(labels: string[], score: number): string {
  return `${labels[score - 1] ?? "Unknown"} (${score}/5)`;
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
 * rejected the analysis, and otherwise its lead article's title.
 */
export function storyTitle(story: {
  headline: string | null;
  reviewVerdict: ReviewVerdict | null;
  leadTitle: string | null;
}): string {
  const headline =
    story.reviewVerdict === ReviewVerdict.Rejected ? null : story.headline;

  return headline ?? story.leadTitle ?? "Untitled story";
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

/** The Stories page's two views of a day. */
export const DayView = {
  Stories: "stories",
  Claims: "claims",
} as const;

export type DayView = (typeof DayView)[keyof typeof DayView];

/**
 * The Stories page's address for a category and day, in the stories view
 * unless another is given, with its claims narrowed to one status if given.
 */
export function dayHref(
  category: string,
  day: string,
  { view, status }: { view?: DayView; status?: Agreement } = {},
): string {
  const params = new URLSearchParams({ category, date: day });

  if (view !== undefined && view !== DayView.Stories) {
    params.set("view", view);
  }

  if (status !== undefined) {
    params.set("status", status);
  }

  return `/?${params}`;
}

/** The view an address asks for, defaulting to stories. */
export function parseDayView(value: unknown): DayView {
  return value === DayView.Claims ? DayView.Claims : DayView.Stories;
}

/** The status an address asks for, if it names one. */
export function parseAgreement(value: unknown): Agreement | undefined {
  return Object.values(Agreement).find((agreement) => agreement === value);
}
