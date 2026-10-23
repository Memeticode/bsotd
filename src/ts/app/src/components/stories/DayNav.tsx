import Link from "next/link";
import type { ReactNode } from "react";

import {
  categoryLabel,
  dayHref,
  formatDay,
  formatShortDay,
  type Agreement,
  type DayView,
} from "@/lib/story-display";
import styles from "./DayNav.module.css";

interface DayNavProps {
  category: string;
  day: string;
  previous?: string;
  next?: string;
  /** Every category with stories, and its latest day, to switch to. */
  categories: { category: string; latestDay: string }[];
  /** Kept when switching days or categories. */
  view: DayView;
  status?: Agreement;
}

/** The day's heading, with links to the days around it and other categories. */
export function DayNav({
  category,
  day,
  previous,
  next,
  categories,
  view,
  status,
}: DayNavProps) {
  const href = (toCategory: string, toDay: string) =>
    dayHref(toCategory, toDay, { view, status });
  const previousHref = previous && href(category, previous);
  const nextHref = next && href(category, next);

  return (
    <div className={styles.dayNav}>
      {categories.length > 1 && (
        <nav aria-label="Categories">
          <ul className={styles.categories}>
            {categories.map((option) => (
              <li key={option.category}>
                <Link
                  href={href(option.category, option.latestDay)}
                  className={styles.category}
                  aria-current={option.category === category ? "true" : undefined}
                >
                  {categoryLabel(option.category)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className={styles.day}>
        <h1 className={styles.title}>
          <span className={styles.eyebrow}>{categoryLabel(category)}</span>
          {formatDay(day)}
        </h1>
        <nav aria-label="Days" className={styles.days}>
          <DayLink href={previousHref} day={previous} label="Earlier day">
            ← {previous && formatShortDay(previous)}
          </DayLink>
          <DayLink href={nextHref} day={next} label="Later day">
            {next && formatShortDay(next)} →
          </DayLink>
        </nav>
      </div>
    </div>
  );
}

function DayLink({
  href,
  day,
  label,
  children,
}: {
  href?: string;
  day?: string;
  label: string;
  children: ReactNode;
}) {
  if (href === undefined || day === undefined) {
    return (
      <span className={styles.disabled} aria-disabled="true">
        {children}
        <span className="visually-hidden">No {label.toLowerCase()}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={styles.dayLink}
      aria-label={`${label}: ${formatDay(day)}`}
    >
      {children}
    </Link>
  );
}
