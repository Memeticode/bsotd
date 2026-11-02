import { ReviewVerdict } from "./story-display.ts";

// Checks editors' form submissions before anything is written. Forms can be
// posted by hand, so every field is checked, not just trusted.

export type Parsed<Value> =
  | { ok: true; value: Value }
  | { ok: false; error: string };

export interface MoveArticle {
  articleId: string;
  /** The story the article is moving out of. */
  fromStoryId: string;
  /** Another of the day's stories, or null for a story of its own. */
  toStoryId: string | null;
  note: string | null;
}

export interface RelevanceOverride {
  storyId: string;
  isRelevant: boolean;
  note: string | null;
}

export interface AnalysisReview {
  storyId: string;
  analysisId: string;
  verdict: ReviewVerdict;
  note: string | null;
}

/** The form value that moves an article into a story of its own. */
export const OWN_STORY = "own";

const MAX_NOTE_LENGTH = 1000;

export function parseMoveArticle(form: FormData): Parsed<MoveArticle> {
  const articleId = id(form, "articleId");
  const fromStoryId = id(form, "storyId");
  const target = text(form, "target");
  const note = parseNote(form);

  if (articleId === null || fromStoryId === null) {
    return invalid("The article or story is missing.");
  }

  if (target !== OWN_STORY && !isId(target)) {
    return invalid("Choose where the article belongs.");
  }

  if (target === fromStoryId) {
    return invalid("The article is already in that story.");
  }

  if (!note.ok) {
    return note;
  }

  return valid({
    articleId,
    fromStoryId,
    toStoryId: target === OWN_STORY ? null : target,
    note: note.value,
  });
}

export function parseRelevanceOverride(form: FormData): Parsed<RelevanceOverride> {
  const storyId = id(form, "storyId");
  const relevant = text(form, "relevant");
  const note = parseNote(form);

  if (storyId === null) {
    return invalid("The story is missing.");
  }

  if (relevant !== "true" && relevant !== "false") {
    return invalid("Choose relevant or not relevant.");
  }

  if (!note.ok) {
    return note;
  }

  return valid({ storyId, isRelevant: relevant === "true", note: note.value });
}

/** For actions on a story as a whole, such as clearing an editor's verdict. */
export function parseStoryId(form: FormData): Parsed<string> {
  const storyId = id(form, "storyId");
  return storyId === null ? invalid("The story is missing.") : valid(storyId);
}

/** For actions on an analysis as a whole, such as clearing its review. */
export function parseAnalysisId(
  form: FormData,
): Parsed<{ storyId: string; analysisId: string }> {
  const storyId = id(form, "storyId");
  const analysisId = id(form, "analysisId");

  return storyId === null || analysisId === null
    ? invalid("The analysis is missing.")
    : valid({ storyId, analysisId });
}

export function parseAnalysisReview(form: FormData): Parsed<AnalysisReview> {
  const storyId = id(form, "storyId");
  const analysisId = id(form, "analysisId");
  const verdict = text(form, "verdict");
  const note = parseNote(form);

  if (storyId === null || analysisId === null) {
    return invalid("The analysis is missing.");
  }

  if (verdict !== ReviewVerdict.Approved && verdict !== ReviewVerdict.Rejected) {
    return invalid("Choose to approve or reject the analysis.");
  }

  if (!note.ok) {
    return note;
  }

  return valid({ storyId, analysisId, verdict, note: note.value });
}

function parseNote(form: FormData): Parsed<string | null> {
  const note = text(form, "note").trim();

  if (note.length > MAX_NOTE_LENGTH) {
    return invalid(`Keep the note under ${MAX_NOTE_LENGTH} characters.`);
  }

  return valid(note === "" ? null : note);
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** A database ID: a positive whole number, kept as a string like bigints. */
function id(form: FormData, name: string): string | null {
  const value = text(form, name);
  return isId(value) ? value : null;
}

function isId(value: string): boolean {
  return /^[1-9]\d{0,18}$/.test(value);
}

function valid<Value>(value: Value): Parsed<Value> {
  return { ok: true, value };
}

function invalid<Value>(error: string): Parsed<Value> {
  return { ok: false, error };
}
