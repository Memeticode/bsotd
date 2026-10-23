"use client";

import { useActionState } from "react";

import { clearRelevanceAction, saveRelevanceAction } from "@/app/stories/actions";
import { IDLE } from "@/lib/action-state";
import {
  CATEGORY_RELEVANCE_LABELS,
  IMPORTANCE_LABELS,
} from "@/lib/story-display";
import { ActionMessage } from "./ActionMessage";
import styles from "./EditorForm.module.css";

interface RelevanceFormProps {
  storyId: string;
  /** The rating in effect, to start from. */
  categoryRelevance: number | null;
  importance: number | null;
  note: string | null;
  /** Whether the rating in effect is an editor's. */
  editorRated: boolean;
}

const SCORES = [5, 4, 3, 2, 1];

/** Sets an editor's rating for the story, or goes back to the model's. */
export function RelevanceForm({
  storyId,
  categoryRelevance,
  importance,
  note,
  editorRated,
}: RelevanceFormProps) {
  const [saved, save, saving] = useActionState(saveRelevanceAction, IDLE);
  const [cleared, clear, clearing] = useActionState(clearRelevanceAction, IDLE);

  return (
    <>
      {/* Keyed on the rating so its fields reset when the rating changes. */}
      <form
        key={`${categoryRelevance}-${importance}-${editorRated}`}
        action={save}
        className={styles.form}
      >
        <input type="hidden" name="storyId" value={storyId} />
        <ScoreField
          name="importance"
          label="Importance"
          labels={IMPORTANCE_LABELS}
          value={importance}
        />
        <ScoreField
          name="categoryRelevance"
          label="Category relevance"
          labels={CATEGORY_RELEVANCE_LABELS}
          value={categoryRelevance}
        />
        <label className={`${styles.field} ${styles.wide}`}>
          Note
          <input
            name="note"
            maxLength={1000}
            defaultValue={editorRated ? (note ?? "") : ""}
            placeholder="Why, for the record"
          />
        </label>
        <button type="submit" className={styles.button} disabled={saving}>
          {editorRated ? "Update editor's rating" : "Rate as editor"}
        </button>
        <ActionMessage state={saved} />
      </form>
      {editorRated && (
        <form action={clear} className={styles.form}>
          <input type="hidden" name="storyId" value={storyId} />
          <button type="submit" className={styles.secondary} disabled={clearing}>
            Use the model's rating instead
          </button>
          <ActionMessage state={cleared} />
        </form>
      )}
    </>
  );
}

function ScoreField({
  name,
  label,
  labels,
  value,
}: {
  name: string;
  label: string;
  labels: string[];
  value: number | null;
}) {
  return (
    <label className={styles.field}>
      {label}
      <select name={name} defaultValue={value ?? ""} required>
        <option value="" disabled>
          Choose…
        </option>
        {SCORES.map((score) => (
          <option key={score} value={score}>
            {score} · {labels[score - 1]}
          </option>
        ))}
      </select>
    </label>
  );
}
