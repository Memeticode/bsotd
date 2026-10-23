import Link from "next/link";

import { Tag } from "@/components/ui/Tag";
import type { FeedStory } from "@/lib/stories";
import {
  IMPORTANCE_LABELS,
  ReviewVerdict,
  count,
  listOutlets,
  storyTitle,
} from "@/lib/story-display";
import styles from "./StoryCard.module.css";

/** A story in the day's feed: its title, summary, coverage and signals. */
export function StoryCard({ story }: { story: FeedStory }) {
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
      </div>
    </article>
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

  if (story.disputedCount > 0) {
    signals.push(
      <Tag key="disputed" tone="warning">
        {count(story.disputedCount, "disputed claim")}
      </Tag>,
    );
  }

  if (story.corroboratedCount > 0) {
    signals.push(
      <Tag key="corroborated">
        {count(story.corroboratedCount, "corroborated claim")}
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
