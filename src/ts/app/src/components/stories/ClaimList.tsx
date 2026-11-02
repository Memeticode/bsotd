import { Fragment } from "react";

import type { StoryClaim } from "@/lib/stories";
import {
  AGREEMENT_DESCRIPTIONS,
  AGREEMENT_LABELS,
  ClaimKind,
  Stance,
  groupClaims,
  listOutlets,
  stancesOf,
  type Source,
} from "@/lib/story-display";
import { SourceLink, SourceLinkList } from "./SourceLink";
import styles from "./ClaimList.module.css";

interface ClaimListProps {
  claims: StoryClaim[];
  /** The outlet behind each article, and its link, by article ID. */
  sources: Record<string, Source>;
  /**
   * Groups the claims by status, disputed first. A single source's claims
   * all share one, so they're listed as they come.
   */
  grouped?: boolean;
  /** Outlets being compared: each claim shows where each one stands. */
  compared?: string[];
  /** The level of each status's heading. */
  headingLevel?: 2 | 3 | 4;
  /** Makes the headings' IDs unique when a page has several lists. */
  idPrefix?: string;
}

/**
 * Claims as a bulleted list, grouped by status unless they're a single
 * source's. Each claim opens to show the outlets that report, contradict or
 * leave it out, in their own words, each linking to its article.
 */
export function ClaimList({
  claims,
  sources,
  grouped = true,
  compared,
  headingLevel = 3,
  idPrefix = "claims",
}: ClaimListProps) {
  const Heading = `h${headingLevel}` as const;

  if (!grouped) {
    return <Claims claims={claims} sources={sources} compared={compared} />;
  }

  return groupClaims(claims).map((group) => {
    const id = `${idPrefix}-${group.agreement.replaceAll(" ", "-")}`;

    return (
      <section
        key={group.agreement}
        className={styles.group}
        data-agreement={group.agreement}
        aria-labelledby={id}
      >
        <Heading
          id={id}
          className={styles.heading}
          title={AGREEMENT_DESCRIPTIONS[group.agreement]}
        >
          {AGREEMENT_LABELS[group.agreement]}
          <span className={styles.count}>{group.claims.length}</span>
        </Heading>
        <Claims claims={group.claims} sources={sources} compared={compared} />
      </section>
    );
  });
}

/** Each claim as a bullet that opens to show its sources. */
function Claims({
  claims,
  sources,
  compared,
}: {
  claims: StoryClaim[];
  sources: Record<string, Source>;
  compared?: string[];
}) {
  return (
    <ul className={styles.claims}>
      {claims.map((claim) => (
        <li key={claim.number}>
          <details>
            <summary className={styles.statement}>
              {claim.statement}
              {compared && (
                <Stances
                  claim={claim}
                  outletOf={(id) => sources[id]?.name ?? ""}
                  outlets={compared}
                />
              )}
            </summary>
            <ClaimDetails claim={claim} sources={sources} />
          </details>
        </li>
      ))}
    </ul>
  );
}

/** e.g. "Reported by CNN · contradicted by WSTM · not mentioned by WMUR" */
function Stances({
  claim,
  outletOf,
  outlets,
}: {
  claim: StoryClaim;
  outletOf: (articleId: string) => string;
  outlets: string[];
}) {
  const { reports, contradicts, silent } = stancesOf(claim, outletOf, outlets);
  const parts = [
    { label: "reported by", names: reports, stance: Stance.Supports },
    { label: "contradicted by", names: contradicts, stance: Stance.Contradicts },
    { label: "not mentioned by", names: silent, stance: undefined },
  ].filter((part) => part.names.length > 0);

  return (
    <span className={styles.stances}>
      {parts.map((part, index) => (
        <Fragment key={part.label}>
          {index > 0 && " · "}
          <span data-stance={part.stance}>
            {index === 0 ? part.label.replace(/^./, (c) => c.toUpperCase()) : part.label}{" "}
            {listOutlets(part.names, part.names.length)}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

interface ClaimDetailsProps {
  claim: StoryClaim;
  sources: Record<string, Source>;
}

function ClaimDetails({ claim, sources }: ClaimDetailsProps) {
  const source = (articleId: string): Source =>
    sources[articleId] ?? { name: "An article since moved", url: null };

  return (
    <div className={styles.details}>
      {claim.kind === ClaimKind.Interpretation && (
        <p className={styles.kind}>
          An interpretation: analysis, prediction or opinion.
        </p>
      )}
      <Sources
        label="Reported by"
        sources={claim.sources.filter((s) => s.stance === Stance.Supports)}
        source={source}
      />
      <Sources
        label="Contradicted by"
        sources={claim.sources.filter((s) => s.stance === Stance.Contradicts)}
        source={source}
      />
      {claim.notMentionedArticleIds.length > 0 && (
        <p className={styles.muted}>
          Not mentioned by{" "}
          <SourceLinkList sources={claim.notMentionedArticleIds.map(source)} />
        </p>
      )}
    </div>
  );
}

function Sources({
  label,
  sources,
  source,
}: {
  label: string;
  sources: StoryClaim["sources"];
  source: (articleId: string) => Source;
}) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className={styles.sources} data-stance={sources[0]!.stance}>
      <p className={styles.label}>{label}</p>
      <ul className={styles.evidence}>
        {sources.map(({ articleId, evidence }) => (
          <li key={articleId}>
            <SourceLink source={source(articleId)} className={styles.outlet} />{" "}
            <q>{evidence}</q>
          </li>
        ))}
      </ul>
    </div>
  );
}
