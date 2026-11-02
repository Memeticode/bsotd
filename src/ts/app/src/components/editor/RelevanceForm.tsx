"use client";

import { useActionState } from "react";

import { clearRelevanceAction, saveRelevanceAction } from "@/app/editor/actions";
import { IDLE } from "@/lib/action-state";
import { ActionMessage } from "./ActionMessage";
import styles from "./EditorForm.module.css";

interface RelevanceFormProps {
  storyId: string;
  /** The verdict in effect: null until the story is rated. */
  isRelevant: boolean | null;
  note: string | null;
  /** Whether the verdict in effect is an editor's. */
  editorDecided: boolean;
}

/** Marks the story relevant or not as an editor, or goes back to the model's verdict. */
export function RelevanceForm({
  storyId,
  isRelevant,
  note,
  editorDecided,
}: RelevanceFormProps) {
  const [saved, save, saving] = useActionState(saveRelevanceAction, IDLE);
  const [cleared, clear, clearing] = useActionState(clearRelevanceAction, IDLE);

  return (
    <>
      {/* Keyed on the verdict so the note resets when it changes. */}
      <form key={`${isRelevant}-${editorDecided}`} action={save} className={styles.form}>
        <input type="hidden" name="storyId" value={storyId} />
        <label className={`${styles.field} ${styles.wide}`}>
          Note
          <input
            name="note"
            maxLength={1000}
            defaultValue={editorDecided ? (note ?? "") : ""}
            placeholder="Why, for the record"
          />
        </label>
        <span className={styles.buttons}>
          <button
            type="submit"
            name="relevant"
            value="true"
            className={styles.button}
            disabled={saving}
          >
            Mark relevant
          </button>
          <button
            type="submit"
            name="relevant"
            value="false"
            className={styles.button}
            disabled={saving}
          >
            Mark not relevant
          </button>
        </span>
        <ActionMessage state={saved} />
      </form>
      {editorDecided && (
        <form action={clear} className={styles.form}>
          <input type="hidden" name="storyId" value={storyId} />
          <button type="submit" className={styles.secondary} disabled={clearing}>
            Use the model's verdict instead
          </button>
          <ActionMessage state={cleared} />
        </form>
      )}
    </>
  );
}
