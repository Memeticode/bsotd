"use client";

import { useState } from "react";

import type { StoryClaim } from "@/lib/stories";
import {
  AGREEMENT_LABELS,
  Agreement,
  citationCounts,
  count,
  countReports,
  filterClaims,
  groupClaims,
  toggleOption,
  type Source,
} from "@/lib/story-display";
import { ClaimList } from "./ClaimList";
import styles from "./ClaimExplorer.module.css";

interface ClaimExplorerProps {
  claims: StoryClaim[];
  /** The outlet behind each article the claims cite, and its link. */
  sources: Record<string, Source>;
  /** The level of each status's heading. */
  headingLevel?: 2 | 3 | 4;
  /** Makes IDs unique when a page has several stories' claims. */
  idPrefix: string;
}

/**
 * A story's claims, with filters for exploring them where there's a choice
 * to make: choose outlets to see the claims they report or contradict, with
 * where each stands when there are two or more, and choose statuses to see
 * where the sources agree, differ or stand alone. Statuses always count
 * every source. A single source's claims are simply listed.
 */
export function ClaimExplorer({
  claims,
  sources,
  headingLevel = 3,
  idPrefix,
}: ClaimExplorerProps) {
  const [chosenOutlets, setChosenOutlets] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [chosenStatuses, setChosenStatuses] = useState<ReadonlySet<Agreement>>(
    new Set(),
  );

  // One report's claims are all single source: there's nothing to compare.
  if (countReports(claims) <= 1) {
    return <ClaimList claims={claims} sources={sources} grouped={false} />;
  }

  const outletOf = (articleId: string) => sources[articleId]?.name ?? "";
  const { bySource, shown } = filterClaims(
    claims,
    outletOf,
    chosenOutlets,
    chosenStatuses,
  );

  const sourceOptions = citationCounts(claims, outletOf).map(
    ([outlet, citations]) => ({ value: outlet, label: outlet, count: citations }),
  );

  // Statuses among the chosen outlets' claims, and any chosen status none of
  // them has, so it can be unchosen.
  const statusCounts = new Map(
    groupClaims(bySource).map((group) => [group.agreement, group.claims.length]),
  );
  const statusOptions = Object.values(Agreement)
    .filter((status) => statusCounts.has(status) || chosenStatuses.has(status))
    .map((status) => ({
      value: status,
      label: AGREEMENT_LABELS[status],
      count: statusCounts.get(status) ?? 0,
    }));

  // Claims that all share a status, as when no two sources report the same
  // thing, have no statuses to choose between.
  const statusesVary = groupClaims(claims).length > 1;
  const filtering = chosenOutlets.size > 0 || chosenStatuses.size > 0;

  return (
    <div className={styles.explorer}>
      <FilterRow
        label="Sources"
        allCount={claims.length}
        options={sourceOptions}
        chosen={chosenOutlets}
        onChoose={setChosenOutlets}
      />
      {statusesVary && (
        <FilterRow
          label="Status"
          allCount={bySource.length}
          options={statusOptions}
          chosen={chosenStatuses}
          onChoose={setChosenStatuses}
        />
      )}

      {filtering && (
        <p className={styles.summary} aria-live="polite">
          {shown.length} of {count(claims.length, "claim")}
          {chosenOutlets.size > 0 &&
            `, each reported or contradicted by ${eitherOf([...chosenOutlets])}`}
          .
        </p>
      )}

      {shown.length > 0 ? (
        <ClaimList
          claims={shown}
          sources={sources}
          compared={chosenOutlets.size > 1 ? [...chosenOutlets] : undefined}
          headingLevel={headingLevel}
          idPrefix={idPrefix}
        />
      ) : (
        <p className={styles.summary}>No claims match these filters.</p>
      )}
    </div>
  );
}

/** e.g. "CNN", "CNN or WSTM", "CNN, WMUR or WSTM" */
function eitherOf(outlets: string[]): string {
  return outlets.length === 1
    ? outlets[0]!
    : `${outlets.slice(0, -1).join(", ")} or ${outlets.at(-1)}`;
}

interface FilterRowProps<Value> {
  label: string;
  /** How many claims "All" stands for. */
  allCount: number;
  options: { value: Value; label: string; count: number }[];
  /** The options chosen; none chosen means all. */
  chosen: ReadonlySet<Value>;
  onChoose: (chosen: ReadonlySet<Value>) => void;
}

/** A row of toggles: All, or any number of options. */
function FilterRow<Value extends string>({
  label,
  allCount,
  options,
  chosen,
  onChoose,
}: FilterRowProps<Value>) {
  return (
    <div role="group" aria-label={label} className={styles.row}>
      <span className={styles.rowLabel} aria-hidden="true">
        {label}
      </span>
      <div className={styles.chips}>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={chosen.size === 0}
          onClick={() => onChoose(new Set())}
        >
          All
          <span className={styles.count}>{allCount}</span>
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.chip}
            data-value={option.value}
            aria-pressed={chosen.has(option.value)}
            onClick={() => onChoose(toggleOption(chosen, option.value))}
          >
            {option.label}
            <span className={styles.count}>{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
