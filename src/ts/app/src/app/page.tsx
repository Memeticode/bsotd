import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { DayNav } from "@/components/stories/DayNav";
import { DayStories } from "@/components/stories/DayStories";
import { Notice } from "@/components/ui/Notice";
import { param, type SearchParams } from "@/lib/pagination";
import {
  fetchDayClaims,
  fetchDaySources,
  fetchFeed,
  fetchStoryDays,
} from "@/lib/stories";
import { adjacentDays, categoryLabel, chooseDay } from "@/lib/story-display";
import styles from "./page.module.css";

interface HomePageProps {
  /** category and date. */
  searchParams: Promise<SearchParams>;
}

/** A day's stories in one category: the relevant ones, then the rest. */
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const days = await fetchStoryDays();
  const choice = chooseDay(days, param(params, "category"), param(params, "date"));

  if (choice === undefined) {
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

  const { categories, category, day, missingDay } = choice;
  const [stories, claims, sources] = await Promise.all([
    fetchFeed(category, day),
    fetchDayClaims(category, day),
    fetchDaySources(category, day),
  ]);

  return (
    <Page>
      <DayNav
        category={category}
        day={day}
        categories={categories}
        {...adjacentDays(days, category, day)}
      />

      {missingDay !== undefined && (
        <Notice tone="warning">
          There are no {categoryLabel(category).toLowerCase()} stories for{" "}
          {missingDay}, so this is the latest day.
        </Notice>
      )}

      <DayStories stories={stories} claims={claims} sources={sources} />
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
