import type { ActionState } from "@/lib/action-state";
import styles from "./EditorForm.module.css";

/** The outcome of an editor's last submission, announced to screen readers. */
export function ActionMessage({ state }: { state: ActionState }) {
  return (
    <p className={styles.message} data-status={state.status} aria-live="polite">
      {state.status === "idle" ? null : state.message}
    </p>
  );
}
