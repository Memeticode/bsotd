"use client";

import { useState, type ReactNode } from "react";

import styles from "./Collapsible.module.css";

interface CollapsibleProps {
  summary: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Content hidden behind a summary line. It stays open or closed while the
 * page re-renders, for example when a table moves to another page.
 */
export function Collapsible({
  summary,
  defaultOpen = false,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={styles.collapsible}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={styles.summary}>{summary}</summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
