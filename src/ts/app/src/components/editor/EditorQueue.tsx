import Link from "next/link";

import { Tag } from "@/components/ui/Tag";
import type { EditorStory } from "@/lib/stories";
import { ReviewVerdict, count, storyTitle } from "@/lib/story-display";
import styles from "./EditorQueue.module.css";

/**
 * A day's stories for editors, in rank order: whether each is relevant and
 * who decided, where its analysis stands, and anything that needs a look.
 */
export function EditorQueue({ stories }: { stories: EditorStory[] }) {
  const relevant = stories.filter((story) => story.isRelevant === true).length;
  const toReview = stories.filter(
    (story) => story.analyzed && story.reviewVerdict === null,
  ).length;
  const flagged = stories.filter((story) => story.flaggedArticles > 0).length;
  const stale = stories.filter(
    (story) => !story.ratingIsCurrent || !story.analysisIsCurrent,
  ).length;

  return (
    <>
      <p className={styles.stats}>
        {count(stories.length, "story", "stories")}: {relevant} relevant ·{" "}
        {count(toReview, "analysis", "analyses")} to review
        {flagged > 0 && ` · ${count(flagged, "story", "stories")} with flagged articles`}
        {stale > 0 && ` · ${stale} out of date`}
      </p>

      <ol className={styles.queue}>
        <li className={styles.header} aria-hidden="true">
          <span>#</span>
          <span>Story</span>
          <span>Relevance</span>
          <span>Analysis</span>
        </li>
        {stories.map((story) => (
          <li key={story.id} className={styles.row}>
            <span className={styles.rank}>{story.rank}</span>
            <div className={styles.story}>
              <Link href={`/editor/stories/${story.id}`} className={styles.title}>
                {storyTitle(story, story.articleCount === 1)}
              </Link>
              <span className={styles.muted}>
                {count(story.articleCount, "article")} ·{" "}
                {count(story.sourceCount, "outlet")}
              </span>
              {story.flaggedArticles > 0 && (
                <span>
                  <Tag tone="warning">
                    {count(story.flaggedArticles, "article")} flagged
                  </Tag>
                </span>
              )}
            </div>
            <div className={styles.cell}>
              <span className={styles.label}>Relevance</span>
              <Relevance story={story} />
            </div>
            <div className={styles.cell}>
              <span className={styles.label}>Analysis</span>
              <Analysis story={story} />
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function Relevance({ story }: { story: EditorStory }) {
  if (story.isRelevant === null) {
    return <span className={styles.muted}>Not rated</span>;
  }

  return (
    <>
      <span>{story.isRelevant ? "Relevant" : "Not relevant"}</span>
      <span className={styles.muted}>
        {story.relevanceByEditor ? "by an editor" : "by the model"}
      </span>
      {story.rated && !story.ratingIsCurrent && (
        <span>
          <Tag tone="warning">Rating out of date</Tag>
        </span>
      )}
    </>
  );
}

function Analysis({ story }: { story: EditorStory }) {
  if (!story.analyzed) {
    return <span className={styles.muted}>Not analyzed</span>;
  }

  return (
    <>
      <span>{count(story.claimCount, "claim")}</span>
      <span>
        {story.reviewVerdict === ReviewVerdict.Approved ? (
          <Tag tone="success">Approved</Tag>
        ) : story.reviewVerdict === ReviewVerdict.Rejected ? (
          <Tag tone="warning">Rejected</Tag>
        ) : (
          <Tag tone="accent">To review</Tag>
        )}
      </span>
      {!story.analysisIsCurrent && (
        <span>
          <Tag tone="warning">Out of date</Tag>
        </span>
      )}
    </>
  );
}
