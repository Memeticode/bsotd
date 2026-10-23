import Link from "next/link";

import { Collapsible } from "@/components/ui/Collapsible";
import { Tag } from "@/components/ui/Tag";
import type { StoryClaim } from "@/lib/stories";
import {
  AGREEMENT_DESCRIPTIONS,
  AGREEMENT_LABELS,
  ClaimKind,
  Stance,
  groupClaims,
} from "@/lib/story-display";
import styles from "./ClaimList.module.css";

/** A claim, and the story it comes from when listing several stories' claims. */
type ListedClaim = StoryClaim & { storyId?: string };

interface ClaimListProps {
  claims: ListedClaim[];
  /** Outlet name by article ID. */
  outlets: Map<string, string>;
  /** Story titles by ID: given, each claim links to its story. */
  stories?: Map<string, string>;
  /** Statements and outlets only, without descriptions or evidence. */
  compact?: boolean;
  /** The level of each status's heading. */
  headingLevel?: 2 | 3 | 4;
  /** Makes the headings' IDs unique when a page has several lists. */
  idPrefix?: string;
}

/**
 * Claims grouped by how their sources line up, disputed first, each with
 * the outlets behind it and their quoted evidence.
 */
export function ClaimList({
  claims,
  outlets,
  stories,
  compact = false,
  headingLevel = 3,
  idPrefix = "claims",
}: ClaimListProps) {
  const Heading = `h${headingLevel}` as const;

  return groupClaims(claims).map((group) => {
    const id = `${idPrefix}-${group.agreement.replaceAll(" ", "-")}`;

    return (
      <section
        key={group.agreement}
        className={styles.group}
        data-agreement={group.agreement}
        data-compact={compact || undefined}
        aria-labelledby={id}
      >
        <Heading id={id} className={styles.heading}>
          {AGREEMENT_LABELS[group.agreement]}
          <span className={styles.count}>{group.claims.length}</span>
        </Heading>
        {!compact && (
          <p className={styles.description}>
            {AGREEMENT_DESCRIPTIONS[group.agreement]}
          </p>
        )}
        <ul className={styles.claims}>
          {group.claims.map((claim) => (
            <Claim
              key={`${claim.storyId ?? ""}-${claim.number}`}
              claim={claim}
              outlets={outlets}
              story={claim.storyId ? stories?.get(claim.storyId) : undefined}
              compact={compact}
            />
          ))}
        </ul>
      </section>
    );
  });
}

interface ClaimProps {
  claim: ListedClaim;
  outlets: Map<string, string>;
  /** The title of the claim's story, to link to. */
  story?: string;
  compact: boolean;
}

function Claim({ claim, outlets, story, compact }: ClaimProps) {
  const name = (articleId: string) =>
    outlets.get(articleId) ?? "an article since moved";
  const names = (articleIds: string[]) => articleIds.map(name).join(", ");

  const supporting = claim.sources.filter((s) => s.stance === Stance.Supports);
  const contradicting = claim.sources.filter(
    (s) => s.stance === Stance.Contradicts,
  );

  return (
    <li className={styles.claim}>
      <p className={styles.statement}>
        {claim.statement}{" "}
        {claim.kind === ClaimKind.Interpretation && <Tag>Interpretation</Tag>}
      </p>
      <p className={styles.sources}>
        {supporting.length > 0 && (
          <span>Reported by {names(supporting.map((s) => s.articleId))}</span>
        )}
        {contradicting.length > 0 && (
          <span className={styles.contradicted}>
            Contradicted by {names(contradicting.map((s) => s.articleId))}
          </span>
        )}
        {!compact && claim.notMentionedArticleIds.length > 0 && (
          <span className={styles.muted}>
            Not mentioned by {names(claim.notMentionedArticleIds)}
          </span>
        )}
      </p>
      {story !== undefined && claim.storyId !== undefined && (
        <p className={styles.story}>
          From <Link href={`/stories/${claim.storyId}`}>{story}</Link>
        </p>
      )}
      {!compact && (
        <Collapsible summary="Evidence">
          <ul className={styles.evidence}>
            {claim.sources.map((source) => (
              <li key={source.articleId}>
                <span className={styles.outlet}>
                  {name(source.articleId)}
                  {source.stance === Stance.Contradicts && " (contradicts)"}
                </span>{" "}
                <q>{source.evidence}</q>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}
    </li>
  );
}
