import Link from "next/link";

import type { DayClaim } from "@/lib/stories";
import {
  AGREEMENT_LABELS,
  Agreement,
  DayView,
  count,
  dayHref,
  groupClaims,
} from "@/lib/story-display";
import { ClaimList } from "./ClaimList";
import styles from "./DayClaims.module.css";

interface DayClaimsProps {
  category: string;
  day: string;
  claims: DayClaim[];
  /** Story titles by ID. */
  titles: Map<string, string>;
  /** Outlet name by article ID. */
  outlets: Map<string, string>;
  /** Shows only claims with this status. */
  status?: Agreement;
}

/** Every claim of the day's analyzed stories, by status, disputed first. */
export function DayClaims({
  category,
  day,
  claims,
  titles,
  outlets,
  status,
}: DayClaimsProps) {
  if (claims.length === 0) {
    return (
      <p className={styles.empty}>
        No claims yet. Story analysis covers each day's top-ranked stories:
        run <code>analyze_gnews.py</code> for {day}.
      </p>
    );
  }

  const shown =
    status === undefined
      ? claims
      : claims.filter((claim) => claim.agreement === status);
  const storyCount = new Set(claims.map((claim) => claim.storyId)).size;

  const counts = new Map(
    groupClaims(claims).map((group) => [group.agreement, group.claims.length]),
  );

  // Statuses the day has claims with, in the order they're listed, and the
  // chosen status even when the day has none.
  const filters: { status?: Agreement; label: string; count: number }[] = [
    { label: "All", count: claims.length },
    ...Object.values(Agreement)
      .filter((agreement) => counts.has(agreement) || agreement === status)
      .map((agreement) => ({
        status: agreement,
        label: AGREEMENT_LABELS[agreement],
        count: counts.get(agreement) ?? 0,
      })),
  ];

  return (
    <>
      <p className={styles.stats}>
        {count(claims.length, "claim")} from{" "}
        {count(storyCount, "analyzed story", "analyzed stories")}, disputed
        first.
      </p>

      <nav aria-label="Claims by status">
        <ul className={styles.filters}>
          {filters.map((filter) => (
            <li key={filter.label}>
              <Link
                href={dayHref(category, day, {
                  view: DayView.Claims,
                  status: filter.status,
                })}
                className={styles.filter}
                data-agreement={filter.status}
                aria-current={filter.status === status ? "true" : undefined}
              >
                {filter.label}
                <span className={styles.count}>{filter.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {shown.length > 0 ? (
        <ClaimList
          claims={shown}
          outlets={outlets}
          stories={titles}
          headingLevel={2}
        />
      ) : (
        <p className={styles.empty}>
          No {status && AGREEMENT_LABELS[status].toLowerCase()} claims on this
          day.
        </p>
      )}
    </>
  );
}
