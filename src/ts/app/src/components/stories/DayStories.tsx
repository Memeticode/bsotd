import Link from "next/link";

import { Collapsible } from "@/components/ui/Collapsible";
import type { DayClaim, FeedStory } from "@/lib/stories";
import { categoryLabel, count, formatDay, storyTitle } from "@/lib/story-display";
import { StoryCard } from "./StoryCard";
import styles from "./DayStories.module.css";

interface DayStoriesProps {
  category: string;
  day: string;
  stories: FeedStory[];
  claims: DayClaim[];
  /** Outlet name by article ID. */
  outlets: Map<string, string>;
}

/**
 * The day's stories, most relevant first: those that fit the category, then
 * those not rated yet, then those outside the category, collapsed.
 */
export function DayStories({
  category,
  day,
  stories,
  claims,
  outlets,
}: DayStoriesProps) {
  const claimsByStory = Map.groupBy(claims, (claim) => claim.storyId);
  const fitting = stories.filter((story) => story.fitsCategory === true);
  const unrated = stories.filter((story) => story.fitsCategory === null);
  const outside = stories.filter((story) => story.fitsCategory === false);
  const articles = stories.reduce((total, story) => total + story.articleCount, 0);
  const outsideCount = count(outside.length, "story", "stories");

  const feed = (list: FeedStory[]) => (
    <ol className={styles.feed}>
      {list.map((story) => (
        <li key={story.id}>
          <StoryCard
            story={story}
            claims={claimsByStory.get(story.id) ?? []}
            outlets={outlets}
          />
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <p className={styles.stats}>
        {count(stories.length, "story", "stories")} from{" "}
        {count(articles, "article")}, most relevant first.
      </p>

      {fitting.length > 0 && feed(fitting)}

      {unrated.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Not rated yet</h2>
          <p className={styles.sectionNote}>
            Rating runs after clustering: <code>rate_gnews.py</code> for{" "}
            {formatDay(day)}.
          </p>
          {feed(unrated)}
        </section>
      )}

      {outside.length > 0 && (
        <section className={styles.section}>
          <Collapsible summary={`${outsideCount} outside ${categoryLabel(category)}`}>
            <ul className={styles.outside}>
              {outside.map((story) => (
                <li key={story.id}>
                  <Link href={`/stories/${story.id}`}>{storyTitle(story)}</Link>{" "}
                  <span className={styles.muted}>
                    {count(story.articleCount, "article")}
                  </span>
                </li>
              ))}
            </ul>
          </Collapsible>
        </section>
      )}
    </>
  );
}
