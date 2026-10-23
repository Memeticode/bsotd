import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./Pager.module.css";

interface PagerProps {
  page: number;
  pageSize: number;
  totalRows: number;
  hrefFor: (page: number) => string;
}

/** "Rows 11–20 of 62", with links to the previous and next pages. */
export function Pager({ page, pageSize, totalRows, hrefFor }: PagerProps) {
  const pageCount = Math.ceil(totalRows / pageSize);
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalRows);

  return (
    <nav className={styles.pager} aria-label="Table pages">
      <span>
        Rows {first}–{last} of {totalRows.toLocaleString("en-US")}
      </span>
      {pageCount > 1 && (
        <span className={styles.controls}>
          <PageLink href={page > 1 ? hrefFor(page - 1) : undefined}>
            ← Previous
          </PageLink>
          <span>
            Page {page} of {pageCount}
          </span>
          <PageLink href={page < pageCount ? hrefFor(page + 1) : undefined}>
            Next →
          </PageLink>
        </span>
      )}
    </nav>
  );
}

function PageLink({ href, children }: { href?: string; children: ReactNode }) {
  if (href === undefined) {
    return (
      <span className={styles.disabled} aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} scroll={false} className={styles.link}>
      {children}
    </Link>
  );
}
