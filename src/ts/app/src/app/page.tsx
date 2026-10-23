import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { DayNav } from "@/components/stories/DayNav";
import { StoryCard } from "@/components/stories/StoryCard";
import { Collapsible } from "@/components/ui/Collapsible";
import { Notice } from "@/components/ui/Notice";
import type { SearchParams } from "@/lib/pagination";
import { fetchFeed, fetchStoryDays, type FeedStory } from "@/lib/stories";
import {
  adjacentDays,
  categoryLabel,
  count,
  formatDay,
  storyTitle,
} from "@/lib/story-display";
import styles from "./page.module.css";

interface HomePageProps {
  searchParams: Promise<SearchParams>;
}

/** The day's stories in one category, most relevant first. */
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const days = await fetchStoryDays();

  if (days.length === 0) {
    return (
      <Page>
        <h1 className={styles.emptyTitle}>No stories yet</h1>
        <p>
          Stories appear once a day's articles have been ingested and run
          through the jobs. The README lists the commands, and the{" "}
          <Link href="/pipeline">pipeline</Link> shows each job's data.
        </p>
      </Page>
    );
  }

  // Each category's latest day, newest first: days come latest first, so
  // the first day seen for a category is its latest.
  const latestDays = new Map<string, string>();

  for (const { category, publishedDate } of days) {
    if (!latestDays.has(category)) {
      latestDays.set(category, publishedDate);
    }
  }

  const categories = [...latestDays].map(([category, latestDay]) => ({
    category,
    latestDay,
  }));

  const requestedCategory = single(params.category);
  const category =
    requestedCategory !== undefined && latestDays.has(requestedCategory)
      ? requestedCategory
      : categories[0]!.category;

  const requestedDay = single(params.date);
  const dayExists = days.some(
    (day) => day.category === category && day.publishedDate === requestedDay,
  );
  const day = dayExists ? requestedDay! : latestDays.get(category)!;

  const label = categoryLabel(category);
  const stories = await fetchFeed(category, day);
  const fitting = stories.filter((story) => story.fitsCategory === true);
  const unrated = stories.filter((story) => story.fitsCategory === null);
  const outside = stories.filter((story) => story.fitsCategory === false);

  return (
    <Page>
      <DayNav
        category={category}
        day={day}
        categories={categories}
        {...adjacentDays(days, category, day)}
      />

      {requestedDay !== undefined && !dayExists && (
        <Notice tone="warning">
          There are no {label.toLowerCase()} stories for{" "}
          {requestedDay}, so this is the latest day.
        </Notice>
      )}

      <p className={styles.stats}>
        {count(stories.length, "story", "stories")} from{" "}
        {count(totalArticles(stories), "article")}, most relevant first.
      </p>

      {fitting.length > 0 && <Feed stories={fitting} />}

      {unrated.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Not rated yet</h2>
          <p className={styles.sectionNote}>
            Rating runs after clustering: <code>rate_gnews.py</code> for{" "}
            {formatDay(day)}.
          </p>
          <Feed stories={unrated} />
        </section>
      )}

      {outside.length > 0 && (
        <section className={styles.section}>
          <Collapsible
            summary={`${count(outside.length, "story", "stories")} outside ${label}`}
          >
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
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader section="stories" />
      <main className={styles.main}>{children}</main>
    </>
  );
}

function Feed({ stories }: { stories: FeedStory[] }) {
  return (
    <ol className={styles.feed}>
      {stories.map((story) => (
        <li key={story.id}>
          <StoryCard story={story} />
        </li>
      ))}
    </ol>
  );
}

function totalArticles(stories: FeedStory[]): number {
  return stories.reduce((total, story) => total + story.articleCount, 0);
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
