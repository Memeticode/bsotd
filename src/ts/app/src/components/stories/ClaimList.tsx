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

interface ClaimListProps {
  claims: StoryClaim[];
  /** Outlet name by article ID. */
  outlets: Map<string, string>;
}

/**
 * The story's claims grouped by how its sources line up, disputed first,
 * each with the outlets behind it and their quoted evidence.
 */
export function ClaimList({ claims, outlets }: ClaimListProps) {
  return groupClaims(claims).map((group) => (
    <section
      key={group.agreement}
      className={styles.group}
      data-agreement={group.agreement}
      aria-labelledby={`claims-${group.agreement}`}
    >
      <h3 id={`claims-${group.agreement}`} className={styles.heading}>
        {AGREEMENT_LABELS[group.agreement]}
        <span className={styles.count}>{group.claims.length}</span>
      </h3>
      <p className={styles.description}>{AGREEMENT_DESCRIPTIONS[group.agreement]}</p>
      <ul className={styles.claims}>
        {group.claims.map((claim) => (
          <Claim key={claim.number} claim={claim} outlets={outlets} />
        ))}
      </ul>
    </section>
  ));
}

function Claim({ claim, outlets }: { claim: StoryClaim; outlets: Map<string, string> }) {
  const name = (articleId: string) => outlets.get(articleId) ?? "an article since moved";
  const names = (articleIds: string[]) => articleIds.map(name).join(", ");

  const supporting = claim.sources.filter((s) => s.stance === Stance.Supports);
  const contradicting = claim.sources.filter((s) => s.stance === Stance.Contradicts);

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
        {claim.notMentionedArticleIds.length > 0 && (
          <span className={styles.muted}>
            Not mentioned by {names(claim.notMentionedArticleIds)}
          </span>
        )}
      </p>
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
    </li>
  );
}
