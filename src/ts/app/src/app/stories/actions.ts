"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/action-state";
import {
  EditorialError,
  clearAnalysisReview,
  clearRelevanceOverride,
  moveArticle,
  saveAnalysisReview,
  saveRelevanceOverride,
} from "@/lib/editorial";
import {
  parseAnalysisId,
  parseAnalysisReview,
  parseMoveArticle,
  parseRelevanceOverride,
  parseStoryId,
  type Parsed,
} from "@/lib/editorial-input";

// Editors' corrections. There are no accounts yet, so anyone who can reach
// the app can make them: keep it on a trusted network.

export async function moveArticleAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const move = parseMoveArticle(form);

  if (!move.ok) {
    return failed(move);
  }

  let storyId: string;
  let previousStoryRemoved: boolean;

  try {
    ({ storyId, previousStoryRemoved } = await moveArticle(move.value));
  } catch (error) {
    return failure(error);
  }

  // The article's form leaves with it, so the page says where it went.
  // The story it left is gone once its last article does, so then the
  // editor follows the article.
  const page = previousStoryRemoved ? storyId : move.value.fromStoryId;

  redirect(`/stories/${page}?movedTo=${storyId}`);
}

export async function saveRelevanceAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const override = parseRelevanceOverride(form);

  if (!override.ok) {
    return failed(override);
  }

  return save(() => saveRelevanceOverride(override.value), "Rating saved.");
}

export async function clearRelevanceAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const storyId = parseStoryId(form);

  if (!storyId.ok) {
    return failed(storyId);
  }

  return save(() => clearRelevanceOverride(storyId.value), "Using the model's rating.");
}

export async function reviewAnalysisAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const review = parseAnalysisReview(form);

  if (!review.ok) {
    return failed(review);
  }

  return save(() => saveAnalysisReview(review.value), "Review saved.");
}

export async function clearReviewAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const ids = parseAnalysisId(form);

  if (!ids.ok) {
    return failed(ids);
  }

  return save(() => clearAnalysisReview(ids.value.analysisId), "Review cleared.");
}

async function save(work: () => Promise<void>, message: string): Promise<ActionState> {
  try {
    await work();
  } catch (error) {
    return failure(error);
  }

  refresh();
  return { status: "saved", message };
}

function failed(parsed: Extract<Parsed<unknown>, { ok: false }>): ActionState {
  return { status: "error", message: parsed.error };
}

function failure(error: unknown): ActionState {
  if (error instanceof EditorialError) {
    return { status: "error", message: error.message };
  }

  console.error(error);
  return {
    status: "error",
    message: "The change couldn't be saved. The server log has the details.",
  };
}
