import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { DayClaims } from "@/components/stories/DayClaims";
import { DayNav } from "@/components/stories/DayNav";
import { DayStories } from "@/components/stories/DayStories";
import { ViewSwitch } from "@/components/stories/ViewSwitch";
import { Notice } from "@/components/ui/Notice";
import type { SearchParams } from "@/lib/pagination";
import {
  fetchDayClaims,
  fetchDayOutlets,
  fetchFeed,
  fetchStoryDays,
} from "@/lib/stories";
import {
  DayView,
  adjacentDays,
  categoryLabel,
  parseAgreement,
  parseDayView,
  storyTitle,
} from "@/lib/story-display";
import styles from "./page.module.css";

interface HomePageProps {
  /** category, date, view ("claims" for the claims view) and status. */
  searchParams: Promise<SearchParams>;
}

/** A day's stories in one category, most relevant first, or their claims. */
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

  const view = parseDayView(single(params.view));
  const status =
    view === DayView.Claims ? parseAgreement(single(params.status)) : undefined;

  const [stories, claims, outlets] = await Promise.all([
    fetchFeed(category, day),
    fetchDayClaims(category, day),
    fetchDayOutlets(category, day),
  ]);

  return (
    <Page>
      <DayNav
        category={category}
        day={day}
        categories={categories}
        view={view}
        status={status}
        {...adjacentDays(days, category, day)}
      />

      {requestedDay !== undefined && !dayExists && (
        <Notice tone="warning">
          There are no {categoryLabel(category).toLowerCase()} stories for{" "}
          {requestedDay}, so this is the latest day.
        </Notice>
      )}

      <ViewSwitch
        category={category}
        day={day}
        view={view}
        storyCount={stories.length}
        claimCount={claims.length}
      />

      {view === DayView.Claims ? (
        <DayClaims
          category={category}
          day={day}
          claims={claims}
          titles={new Map(stories.map((story) => [story.id, storyTitle(story)]))}
          outlets={outlets}
          status={status}
        />
      ) : (
        <DayStories
          category={category}
          day={day}
          stories={stories}
          claims={claims}
          outlets={outlets}
        />
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

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
