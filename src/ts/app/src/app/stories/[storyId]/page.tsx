import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site/SiteHeader";
import { ArticleList } from "@/components/stories/ArticleList";
import { ClaimExplorer } from "@/components/stories/ClaimExplorer";
import { FramingList } from "@/components/stories/FramingList";
import { SourceLink } from "@/components/stories/SourceLink";
import { StoryImage } from "@/components/stories/StoryImage";
import { StorySources } from "@/components/stories/StorySources";
import {
  fetchStory,
  fetchStoryAnalysis,
  fetchStoryArticles,
  fetchStoryClaims,
  type StoryDetail,
} from "@/lib/stories";
import {
  ReviewVerdict,
  categoryLabel,
  count,
  countReports,
  dayHref,
  formatDay,
  formatTime,
  isStoryId,
  pageTitle,
  type Source,
} from "@/lib/story-display";
import styles from "./page.module.css";

interface StoryPageProps {
  params: Promise<{ storyId: string }>;
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { storyId } = await params;
  const story = isStoryId(storyId) ? await fetchStory(storyId) : undefined;

  if (story === undefined) {
    return { title: "Story not found" };
  }

  const [analysis, claims] = await Promise.all([
    fetchStoryAnalysis(storyId),
    fetchStoryClaims(storyId),
  ]);

  return { title: pageTitle(story, analysis, claims) };
}

/** A story for readers: what happened, what each source says, and how. */
export default async function StoryPage({ params }: StoryPageProps) {
  const { storyId } = await params;
  const story = isStoryId(storyId) ? await fetchStory(storyId) : undefined;

  if (story === undefined) {
    notFound();
  }

  const [analysis, claims, articles] = await Promise.all([
    fetchStoryAnalysis(story.id),
    fetchStoryClaims(story.id),
    fetchStoryArticles(story.id),
  ]);

  const sources: Record<string, Source> = Object.fromEntries(
    articles.map((article) => [
      article.id,
      { name: article.sourceName ?? "Unknown outlet", url: article.url },
    ]),
  );
  // A rejected analysis isn't shown to readers.
  const shown = analysis?.reviewVerdict === ReviewVerdict.Rejected ? undefined : analysis;
  // A single source's claims have nothing to compare, so they're read, not
  // filtered.
  const singleSource = countReports(claims) <= 1;

  return (
    <>
      <SiteHeader section="stories" />
      <main className={styles.main}>
        <Link href={dayHref(story.category, story.publishedDate)} className={styles.back}>
          ← {categoryLabel(story.category)}, {formatDay(story.publishedDate)}
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>
            {story.isRelevant === null
              ? "Not rated yet"
              : story.isRelevant
                ? `Relevant: number ${story.rank} of ${story.relevantThatDay} that day`
                : "Not relevant"}
          </p>
          <h1 className={styles.title}>{pageTitle(story, analysis, claims)}</h1>
          <p className={styles.summary}>{shown?.summary ?? story.leadDescription}</p>
          {story.imageUrl && (
            <figure className={styles.figure}>
              <StoryImage src={story.imageUrl} className={styles.image} loading="eager" />
              {story.imageSource && (
                <figcaption className={styles.caption}>
                  Image:{" "}
                  <SourceLink source={{ name: story.imageSource, url: story.leadUrl }} />
                </figcaption>
              )}
            </figure>
          )}
          <StorySources sources={story.sources} />
          <p className={styles.meta}>{coverage(story)}</p>
        </header>

        {shown && claims.length > 0 && (
          <section className={styles.section} aria-labelledby="claims">
            <h2 id="claims" className={styles.sectionTitle}>
              {singleSource ? "What the source says" : "What the sources say"}
            </h2>
            <p className={styles.sectionNote}>
              {singleSource
                ? "Every claim here comes from one report, so no other outlet corroborates or disputes it. Open a claim to see the report's own words."
                : "A claim's status counts every source, with copies of one report counted once. Choose sources to see the claims they report or contradict; choose two or more to compare them, claim by claim. Open a claim to see who reports it, contradicts it or leaves it out, in their own words."}
            </p>
            <ClaimExplorer claims={claims} sources={sources} idPrefix="claims" />
          </section>
        )}

        {shown && shown.framing.length > 0 && (
          <section className={styles.section} aria-labelledby="framing">
            <h2 id="framing" className={styles.sectionTitle}>
              {shown.framing.length === 1
                ? "How the outlet covers it"
                : "How each outlet covers it"}
            </h2>
            <FramingList analysis={shown} sources={sources} />
          </section>
        )}

        <section className={styles.section} aria-labelledby="articles">
          <h2 id="articles" className={styles.sectionTitle}>
            {articles.length === 1 ? "Article" : "Articles"}
          </h2>
          <ArticleList articles={articles} />
        </section>

        <p className={styles.editLink}>
          <Link href={`/editor/stories/${story.id}`}>Edit this story</Link>
        </p>
      </main>
    </>
  );
}

/**
 * e.g. "5 articles from 8 outlets, first published 09:55 UTC.", or just
 * "Published 09:55 UTC." for one outlet's article.
 */
function coverage(story: StoryDetail): string {
  const published = formatTime(story.firstPublishedAt);

  if (story.articleCount > 1) {
    return `${count(story.articleCount, "article")} from ${count(story.sourceCount, "outlet")}, first published ${published}.`;
  }

  return story.sourceCount > 1
    ? `One report, run word for word by ${count(story.sourceCount, "outlet")}, published ${published}.`
    : `Published ${published}.`;
}
