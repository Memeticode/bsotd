import type { ReactNode } from "react";

import styles from "./Tag.module.css";

interface TagProps {
  children: ReactNode;
  /**
   * "accent" draws attention, e.g. to a step's output; "warning" and
   * "success" mark something to check or something done.
   */
  tone?: "accent" | "warning" | "success";
}

/** A small uppercase label, e.g. a step or dataset kind. */
export function Tag({ children, tone }: TagProps) {
  return (
    <span className={styles.tag} data-tone={tone}>
      {children}
    </span>
  );
}
