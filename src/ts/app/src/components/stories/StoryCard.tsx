import Link from "next/link";
import { Fragment } from "react";

import { Collapsible } from "@/components/ui/Collapsible";
import type { FeedStory, StoryClaim } from "@/lib/stories";
import {
  AGREEMENT_LABELS,
  Agreement,
  ReviewVerdict,
  count,
  countReports,
  groupClaims,
  isSingleSource,
  storyTitle,
  type Source,
} from "@/lib/story-display";
import { ClaimExplorer } from "./ClaimExplorer";
import { StoryImage } from "./StoryImage";
import { StorySources } from "./StorySources";
import styles from "./StoryCard.module.css";

interface StoryCardProps {
  story: FeedStory;
  /** The story's claims, if it has been analyzed. */
  claims: StoryClaim[];
  /** The outlet behind each of the day's articles, and its link, by article ID. */
  sources: Map<string, Source>;
  /** Shows the story's rank, which only relevant stories need. */
  ranked?: boolean;
}

/**
 * A story in the day's feed: its headline, summary, image and sources, and
 * its claims, collapsed until opened, with filters for exploring them.
 */
export function StoryCard({ story, claims, sources, ranked = false }: StoryCardProps) {
  const analyzed =
    story.headline !== null && story.reviewVerdict !== ReviewVerdict.Rejected;
  const summary = analyzed ? story.summary : story.leadDescription;
  const href = `/stories/${story.id}`;

  return (
    <article className={ranked ? styles.card : `${styles.card} ${styles.unranked}`}>
      {ranked && (
        <p className={styles.rank}>
          <span className="visually-hidden">Rank </span>
          {story.rank}
        </p>
      )}
      <div className={styles.body}>
        {story.imageUrl && (
          // The headline links to the story too, so screen readers and the
          // keyboard skip this one.
          <Link href={href} className={styles.image} tabIndex={-1} aria-hidden="true">
            <StoryImage
              src={story.imageUrl}
              title={story.imageSource ? `Image: ${story.imageSource}` : undefined}
            />
          </Link>
        )}
        <h2 className={styles.title}>
          <Link href={href}>
            {storyTitle(story, isSingleSource(story.articleCount, claims))}
          </Link>
        </h2>
        {summary && <p className={styles.summary}>{summary}</p>}
        <StorySources sources={story.sources} className={styles.sources} />
      </div>
      {claims.length > 0 && (
        <div className={styles.claims}>
          <Collapsible summary={<ClaimCounts claims={claims} />}>
            <ClaimExplorer
              claims={claims}
              sources={citedSources(claims, sources)}
              idPrefix={`story-${story.id}-claims`}
            />
          </Collapsible>
        </div>
      )}
    </article>
  );
}

/** The outlets behind the articles the claims cite, by article ID. */
function citedSources(
  claims: StoryClaim[],
  sources: Map<string, Source>,
): Record<string, Source> {
  const articleIds = claims.flatMap((claim) => [
    ...claim.sources.map((source) => source.articleId),
    ...claim.notMentionedArticleIds,
  ]);

  return Object.fromEntries(
    articleIds.flatMap((id) => {
      const source = sources.get(id);
      return source === undefined ? [] : [[id, source]];
    }),
  );
}

/**
 * e.g. "12 claims: 2 disputed · 8 corroborated · 2 single source", or just
 * "8 claims" for a single source's, which can only be single source.
 */
function ClaimCounts({ claims }: { claims: StoryClaim[] }) {
  if (countReports(claims) <= 1) {
    return count(claims.length, "claim");
  }

  return (
    <>
      {count(claims.length, "claim")}:{" "}
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
