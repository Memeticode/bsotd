import type { ReactNode } from "react";

import styles from "./Tag.module.css";

/** A small uppercase label, e.g. a step or dataset kind. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>;
}
