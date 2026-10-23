import type { ReactNode } from "react";

import styles from "./Notice.module.css";

interface NoticeProps {
  /** "warning" for something that needs attention. */
  tone?: "info" | "warning";
  children: ReactNode;
}

/** A short message set apart from the page, such as a stale-data warning. */
export function Notice({ tone = "info", children }: NoticeProps) {
  return (
    <div className={styles.notice} data-tone={tone} role="note">
      {children}
    </div>
  );
}
