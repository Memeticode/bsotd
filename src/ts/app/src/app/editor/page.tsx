import type { Metadata } from "next";
import type { ReactNode } from "react";

import { EditorQueue } from "@/components/editor/EditorQueue";
import { SiteHeader } from "@/components/site/SiteHeader";
import { DayNav } from "@/components/stories/DayNav";
import { Notice } from "@/components/ui/Notice";
import { param, type SearchParams } from "@/lib/pagination";
import { fetchEditorQueue, fetchStoryDays } from "@/lib/stories";
import { adjacentDays, categoryLabel, chooseDay } from "@/lib/story-display";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Editor" };

interface EditorPageProps {
  /** category and date. */
  searchParams: Promise<SearchParams>;
}

/** A day's stories for editors to check and correct. */
export default async function EditorPage({ searchParams }: EditorPageProps) {
  const params = await searchParams;
  const days = await fetchStoryDays();
  const choice = chooseDay(days, param(params, "category"), param(params, "date"));

  if (choice === undefined) {
    return (
      <Page>
        <h1 className={styles.emptyTitle}>Nothing to edit yet</h1>
        <p>Stories appear here once a day's articles have been clustered.</p>
      </Page>
    );
  }

  const { categories, category, day, missingDay } = choice;
  const stories = await fetchEditorQueue(category, day);

  return (
    <Page>
      <DayNav
        category={category}
        day={day}
        categories={categories}
        base="/editor"
        {...adjacentDays(days, category, day)}
      />

      {missingDay !== undefined && (
        <Notice tone="warning">
          There are no {categoryLabel(category).toLowerCase()} stories for{" "}
          {missingDay}, so this is the latest day.
        </Notice>
      )}

      <p className={styles.note}>
        Open a story to mark it relevant or not, review its analysis or move
        its articles. Corrections apply at once, and the jobs keep them when
        they run again. There are no accounts yet, so keep the app on a
        trusted network.
      </p>

      <EditorQueue stories={stories} />
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader section="editor" />
      <main className={styles.main}>{children}</main>
    </>
  );
}
