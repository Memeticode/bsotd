import { Collapsible } from "@/components/ui/Collapsible";
import type { DayClaim, FeedStory } from "@/lib/stories";
import { count, type Source } from "@/lib/story-display";
import { StoryCard } from "./StoryCard";
import styles from "./DayStories.module.css";

interface DayStoriesProps {
  stories: FeedStory[];
  claims: DayClaim[];
  /** The outlet behind each of the day's articles, and its link, by article ID. */
  sources: Map<string, Source>;
}

/**
 * The day's stories in two groups: the relevant ones, most important first,
 * and the rest, collapsed. Stories not rated yet are in neither, between.
 */
export function DayStories({ stories, claims, sources }: DayStoriesProps) {
  const claimsByStory = Map.groupBy(claims, (claim) => claim.storyId);

  const relevant = stories.filter((story) => story.isRelevant === true);
  const unrated = stories.filter((story) => story.isRelevant === null);
  const notRelevant = stories.filter((story) => story.isRelevant === false);
  const articles = stories.reduce((total, story) => total + story.articleCount, 0);

  const feed = (list: FeedStory[], ranked: boolean) => (
    <ol className={styles.feed}>
      {list.map((story) => (
        <li key={story.id}>
          <StoryCard
            story={story}
            claims={claimsByStory.get(story.id) ?? []}
            sources={sources}
            ranked={ranked}
          />
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <p className={styles.stats}>
        {count(stories.length, "story", "stories")} from{" "}
        {count(articles, "article")},{" "}
        {relevant.length === 0 ? "none" : relevant.length} relevant.
      </p>

      {relevant.length > 0
        ? feed(relevant, true)
        : unrated.length === 0 && (
            <p className={styles.empty}>No relevant stories this day.</p>
          )}

      {unrated.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Not rated yet</h2>
          <p className={styles.sectionNote}>
            These stories haven't been sorted into relevant or not yet.
          </p>
          {feed(unrated, false)}
        </section>
      )}

      {notRelevant.length > 0 && (
        <section className={styles.section}>
          <Collapsible
            summary={`Not relevant: ${count(notRelevant.length, "story", "stories")}`}
          >
            {feed(notRelevant, false)}
          </Collapsible>
        </section>
      )}
    </>
  );
}
