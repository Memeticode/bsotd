import Link from "next/link";
import type { ReactNode } from "react";

import {
  categoryLabel,
  dayHref,
  formatDay,
  formatShortDay,
} from "@/lib/story-display";
import styles from "./DayNav.module.css";

interface DayNavProps {
  category: string;
  day: string;
  previous?: string;
  next?: string;
  /** Every category with stories, and its latest day, to switch to. */
  categories: { category: string; latestDay: string }[];
}

/** The day's heading, with links to the days around it and other categories. */
export function DayNav({
  category,
  day,
  previous,
  next,
  categories,
}: DayNavProps) {
  return (
    <div className={styles.dayNav}>
      {categories.length > 1 && (
        <nav aria-label="Categories">
          <ul className={styles.categories}>
            {categories.map((option) => (
              <li key={option.category}>
                <Link
                  href={dayHref(option.category, option.latestDay)}
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
          <DayLink category={category} day={previous} label="Earlier day">
            ← {previous && formatShortDay(previous)}
          </DayLink>
          <DayLink category={category} day={next} label="Later day">
            {next && formatShortDay(next)} →
          </DayLink>
        </nav>
      </div>
    </div>
  );
}

function DayLink({
  category,
  day,
  label,
  children,
}: {
  category: string;
  day?: string;
  label: string;
  children: ReactNode;
}) {
  if (day === undefined) {
    return (
      <span className={styles.disabled} aria-disabled="true">
        {children}
        <span className="visually-hidden">No {label.toLowerCase()}</span>
      </span>
    );
  }

  return (
    <Link
      href={dayHref(category, day)}
      className={styles.dayLink}
      aria-label={`${label}: ${formatDay(day)}`}
    >
      {children}
    </Link>
  );
}
