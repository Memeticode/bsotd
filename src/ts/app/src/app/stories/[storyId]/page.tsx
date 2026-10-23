import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site/SiteHeader";
import { AnalysisPanel } from "@/components/stories/AnalysisPanel";
import { ArticleList } from "@/components/stories/ArticleList";
import { ClaimList } from "@/components/stories/ClaimList";
import { FramingList } from "@/components/stories/FramingList";
import { RelevancePanel } from "@/components/stories/RelevancePanel";
import { Notice } from "@/components/ui/Notice";
import type { SearchParams } from "@/lib/pagination";
import {
  fetchOtherStories,
  fetchStory,
  fetchStoryAnalysis,
  fetchStoryArticles,
  fetchStoryClaims,
  type StoryAnalysis,
  type StoryArticle,
  type StoryDetail,
} from "@/lib/stories";
import {
  ReviewVerdict,
  categoryLabel,
  count,
  dayHref,
  formatDay,
  formatTime,
  listOutlets,
  storyTitle,
} from "@/lib/story-display";
import styles from "./page.module.css";

interface StoryPageProps {
  params: Promise<{ storyId: string }>;
  /** After an editor moves an article: `movedTo`, its new story. */
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { storyId } = await params;
  const story = isStoryId(storyId) ? await fetchStory(storyId) : undefined;

  if (story === undefined) {
    return { title: "Story not found" };
  }

  return { title: titleOf(story, await fetchStoryAnalysis(storyId)) };
}

export default async function StoryPage({ params, searchParams }: StoryPageProps) {
  const { storyId } = await params;
  const { movedTo } = await searchParams;
  const story = isStoryId(storyId) ? await fetchStory(storyId) : undefined;

  if (story === undefined) {
    notFound();
  }

  const [analysis, claims, articles, otherStories] = await Promise.all([
    fetchStoryAnalysis(story.id),
    fetchStoryClaims(story.id),
    fetchStoryArticles(story.id),
    fetchOtherStories(story),
  ]);

  const outlets = new Map(
    articles.map((article) => [article.id, article.sourceName ?? "Unknown outlet"]),
  );
  const shown = analysis?.reviewVerdict === ReviewVerdict.Rejected ? undefined : analysis;
  const flagged = new Set(story.rating?.differentEventArticleIds ?? []);

  return (
    <>
      <SiteHeader section="stories" />
      <main className={styles.main}>
        <Link href={dayHref(story.category, story.publishedDate)} className={styles.back}>
          ← {categoryLabel(story.category)}, {formatDay(story.publishedDate)}
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>
            {story.fitsCategory === false
              ? `Outside ${categoryLabel(story.category)}`
              : `Number ${story.rank} of ${story.storiesThatDay} that day`}
          </p>
          <h1 className={styles.title}>{titleOf(story, analysis)}</h1>
          <p className={styles.summary}>{shown?.summary ?? story.leadDescription}</p>
          {shown && shown.takeaways.length > 0 && (
            <ul className={styles.takeaways}>
              {shown.takeaways.map((takeaway) => (
                <li key={takeaway}>{takeaway}</li>
              ))}
            </ul>
          )}
          <p className={styles.meta}>
            {count(story.articleCount, "article")} from{" "}
            {count(story.sourceCount, "outlet")}: {listOutlets(story.sourceNames, 6)}.
            First published {formatTime(story.firstPublishedAt)}.
          </p>
        </header>

        {typeof movedTo === "string" && isStoryId(movedTo) && (
          <Notice>
            <p>
              {movedTo === story.id ? (
                "The article was moved into this story. It's listed below."
              ) : (
                <>
                  The article was moved to{" "}
                  <Link href={`/stories/${movedTo}`}>its new story</Link>.
                </>
              )}
            </p>
          </Notice>
        )}

        <StoryNotices story={story} analysis={analysis} articles={articles} />

        {shown && claims.length > 0 && (
          <section className={styles.section} aria-labelledby="claims">
            <h2 id="claims" className={styles.sectionTitle}>
              What the sources say
            </h2>
            <p className={styles.sectionNote}>
              Each claim lists the outlets that report it. Copies of one report
              count once, and interpretations (analysis, predictions and
              opinions) are marked.
            </p>
            <ClaimList claims={claims} outlets={outlets} />
          </section>
        )}

        {shown && shown.framing.length > 0 && (
          <section className={styles.section} aria-labelledby="framing">
            <h2 id="framing" className={styles.sectionTitle}>
              How each outlet covers it
            </h2>
            <FramingList analysis={shown} outlets={outlets} />
          </section>
        )}

        <section className={styles.section} aria-labelledby="articles">
          <h2 id="articles" className={styles.sectionTitle}>
            Articles
          </h2>
          <ArticleList
            storyId={story.id}
            articles={articles}
            flagged={flagged}
            targets={otherStories}
          />
        </section>

        <section className={styles.section} aria-labelledby="editorial">
          <h2 id="editorial" className={styles.sectionTitle}>
            Editorial review
          </h2>
          <p className={styles.sectionNote}>
            Corrections apply at once, and the jobs keep them when they run again.
          </p>
          <RelevancePanel story={story} />
          {analysis && <AnalysisPanel storyId={story.id} analysis={analysis} />}
        </section>
      </main>
    </>
  );
}

/** Warnings about the story's data: what's stale, rejected or flagged. */
function StoryNotices({
  story,
  analysis,
  articles,
}: {
  story: StoryDetail;
  analysis: StoryAnalysis | undefined;
  articles: StoryArticle[];
}) {
  const flagged = articles.filter((article) =>
    story.rating?.differentEventArticleIds.includes(article.id),
  );

  return (
    <>
      {flagged.length > 0 && (
        <Notice tone="warning">
          <p>
            The rating model judged {count(flagged.length, "article")} to report a
            different event from the rest:{" "}
            {flagged.map((article) => `“${article.title}”`).join(", ")}. If
            it's right, move {flagged.length === 1 ? "it" : "them"} below.
          </p>
        </Notice>
      )}
      {analysis?.reviewVerdict === ReviewVerdict.Rejected && (
        <Notice tone="warning">
          <p>
            An editor rejected this story's analysis
            {analysis.reviewNote ? `: ${analysis.reviewNote}` : "."} Its claims
            are hidden until it's analyzed again or the review is cleared.
          </p>
        </Notice>
      )}
      {analysis && !analysis.isCurrent && (
        <Notice tone="warning">
          <p>
            The story's articles have changed since it was analyzed. Run{" "}
            <code>analyze_gnews.py</code> for {story.publishedDate} to refresh it.
          </p>
        </Notice>
      )}
      {analysis === undefined && story.fitsCategory !== false && (
        <Notice>
          <p>
            Not analyzed yet. Story analysis covers each day's top-ranked stories;
            run <code>analyze_gnews.py</code> for {story.publishedDate} with a
            higher <code>--limit</code> to include this one.
          </p>
        </Notice>
      )}
    </>
  );
}

function titleOf(story: StoryDetail, analysis: StoryAnalysis | undefined): string {
  return storyTitle({
    headline: analysis?.headline ?? null,
    reviewVerdict: analysis?.reviewVerdict ?? null,
    leadTitle: story.leadTitle,
  });
}

/** Story IDs are bigints; anything else can't name a story. */
function isStoryId(value: string): boolean {
  return /^[1-9]\d{0,18}$/.test(value);
}
