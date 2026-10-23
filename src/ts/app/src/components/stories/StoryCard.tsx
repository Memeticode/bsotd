import Link from "next/link";
import { Fragment } from "react";

import { Collapsible } from "@/components/ui/Collapsible";
import { Tag } from "@/components/ui/Tag";
import type { FeedStory, StoryClaim } from "@/lib/stories";
import {
  AGREEMENT_LABELS,
  Agreement,
  IMPORTANCE_LABELS,
  ReviewVerdict,
  count,
  groupClaims,
  listOutlets,
  storyTitle,
} from "@/lib/story-display";
import { ClaimList } from "./ClaimList";
import styles from "./StoryCard.module.css";

interface StoryCardProps {
  story: FeedStory;
  /** The story's claims, if it has been analyzed. */
  claims: StoryClaim[];
  /** Outlet name by article ID. */
  outlets: Map<string, string>;
}

/**
 * A story in the day's feed: its title, summary, coverage and signals, and
 * its claims by status, collapsed until opened.
 */
export function StoryCard({ story, claims, outlets }: StoryCardProps) {
  const analyzed =
    story.headline !== null && story.reviewVerdict !== ReviewVerdict.Rejected;
  const summary = analyzed ? story.summary : story.leadDescription;

  return (
    <article className={styles.card}>
      <p className={styles.rank}>
        <span className="visually-hidden">Rank </span>
        {story.rank}
      </p>
      <div className={styles.body}>
        <h2 className={styles.title}>
          <Link href={`/stories/${story.id}`}>{storyTitle(story)}</Link>
        </h2>
        {summary && <p className={styles.summary}>{summary}</p>}
        {analyzed && story.takeaways.length > 0 && (
          <ul className={styles.takeaways}>
            {story.takeaways.slice(0, 2).map((takeaway) => (
              <li key={takeaway}>{takeaway}</li>
            ))}
          </ul>
        )}
        <p className={styles.coverage}>
          {count(story.articleCount, "article")} from{" "}
          {count(story.sourceCount, "outlet")}: {listOutlets(story.sourceNames)}
        </p>
        <Signals story={story} />
        {claims.length > 0 && (
          <div className={styles.claims}>
            <Collapsible summary={<ClaimCounts claims={claims} />}>
              <ClaimList
                claims={claims}
                outlets={outlets}
                compact
                idPrefix={`story-${story.id}-claims`}
              />
            </Collapsible>
          </div>
        )}
      </div>
    </article>
  );
}

/** e.g. "Claims: 2 disputed · 8 corroborated · 2 single source" */
function ClaimCounts({ claims }: { claims: StoryClaim[] }) {
  return (
    <>
      Claims:{" "}
      {groupClaims(claims).map((group, index) => (
        <Fragment key={group.agreement}>
          {index > 0 && " · "}
          <span
            className={
              group.agreement === Agreement.Disputed ? styles.disputed : undefined
            }
          >
            {group.claims.length} {AGREEMENT_LABELS[group.agreement].toLowerCase()}
          </span>
        </Fragment>
      ))}
    </>
  );
}

function Signals({ story }: { story: FeedStory }) {
  const signals = [];

  if (story.importance !== null) {
    signals.push(
      <Tag key="importance" tone={story.importance >= 4 ? "accent" : undefined}>
        {IMPORTANCE_LABELS[story.importance - 1]} importance
      </Tag>,
    );
  }

  if (story.reviewVerdict === ReviewVerdict.Approved) {
    signals.push(
      <Tag key="approved" tone="success">
        Reviewed
      </Tag>,
    );
  }

  if (story.ratedByEditor) {
    signals.push(<Tag key="editor">Rated by an editor</Tag>);
  }

  return signals.length > 0 && <p className={styles.signals}>{signals}</p>;
}
