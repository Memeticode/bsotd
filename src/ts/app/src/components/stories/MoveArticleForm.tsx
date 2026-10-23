"use client";

import { useActionState } from "react";

import { moveArticleAction } from "@/app/stories/actions";
import { IDLE } from "@/lib/action-state";
import { OWN_STORY } from "@/lib/editorial-input";
import type { StoryOption } from "@/lib/stories";
import { count } from "@/lib/story-display";
import { ActionMessage } from "./ActionMessage";
import styles from "./EditorForm.module.css";

interface MoveArticleFormProps {
  storyId: string;
  articleId: string;
  /** The day's other stories. */
  targets: StoryOption[];
  /** False when the article is already alone in its story. */
  canSplit: boolean;
}

/** Moves an article to another of the day's stories, or into one of its own. */
export function MoveArticleForm({
  storyId,
  articleId,
  targets,
  canSplit,
}: MoveArticleFormProps) {
  const [state, action, pending] = useActionState(moveArticleAction, IDLE);

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="storyId" value={storyId} />
      <input type="hidden" name="articleId" value={articleId} />
      <label className={`${styles.field} ${styles.wide}`}>
        Belongs in
        <select name="target" defaultValue="" required>
          <option value="" disabled>
            Choose a story…
          </option>
          {canSplit && <option value={OWN_STORY}>A new story of its own</option>}
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.title} ({count(target.articleCount, "article")})
            </option>
          ))}
        </select>
      </label>
      <label className={`${styles.field} ${styles.wide}`}>
        Note
        <input name="note" maxLength={1000} placeholder="Why, for the record" />
      </label>
      <button type="submit" className={styles.button} disabled={pending}>
        Move article
      </button>
      <ActionMessage state={state} />
    </form>
  );
}
