"use client";

import { useActionState } from "react";

import { clearReviewAction, reviewAnalysisAction } from "@/app/stories/actions";
import { IDLE } from "@/lib/action-state";
import { ReviewVerdict } from "@/lib/story-display";
import { ActionMessage } from "./ActionMessage";
import styles from "./EditorForm.module.css";

interface ReviewFormProps {
  storyId: string;
  analysisId: string;
  verdict: ReviewVerdict | null;
  note: string | null;
}

/** Approves or rejects an analysis, or clears its review. */
export function ReviewForm({ storyId, analysisId, verdict, note }: ReviewFormProps) {
  const [reviewed, review, reviewing] = useActionState(reviewAnalysisAction, IDLE);
  const [cleared, clear, clearing] = useActionState(clearReviewAction, IDLE);

  return (
    <>
      <form key={verdict ?? "unreviewed"} action={review} className={styles.form}>
        <input type="hidden" name="storyId" value={storyId} />
        <input type="hidden" name="analysisId" value={analysisId} />
        <label className={`${styles.field} ${styles.wide}`}>
          Note
          <input
            name="note"
            maxLength={1000}
            defaultValue={note ?? ""}
            placeholder="What's right or wrong with it"
          />
        </label>
        <span className={styles.buttons}>
          <button
            type="submit"
            name="verdict"
            value={ReviewVerdict.Approved}
            className={styles.button}
            disabled={reviewing}
          >
            Approve
          </button>
          <button
            type="submit"
            name="verdict"
            value={ReviewVerdict.Rejected}
            className={styles.danger}
            disabled={reviewing}
          >
            Reject
          </button>
        </span>
        <ActionMessage state={reviewed} />
      </form>
      {verdict !== null && (
        <form action={clear} className={styles.form}>
          <input type="hidden" name="storyId" value={storyId} />
          <input type="hidden" name="analysisId" value={analysisId} />
          <button type="submit" className={styles.secondary} disabled={clearing}>
            Clear the review
          </button>
          <ActionMessage state={cleared} />
        </form>
      )}
    </>
  );
}
