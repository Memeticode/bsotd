import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalysisPanel } from "@/components/editor/AnalysisPanel";
import { RelevancePanel } from "@/components/editor/RelevancePanel";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ArticleList } from "@/components/stories/ArticleList";
import { ClaimList } from "@/components/stories/ClaimList";
import { Notice } from "@/components/ui/Notice";
import { param, type SearchParams } from "@/lib/pagination";
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
  isSingleSource,
  isStoryId,
  pageTitle,
  type Source,
} from "@/lib/story-display";
import styles from "./page.module.css";

interface EditorStoryPageProps {
  params: Promise<{ storyId: string }>;
  /** After an editor moves an article: `movedTo`, its new story. */
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
}: EditorStoryPageProps): Promise<Metadata> {
  const { storyId } = await params;
  const story = isStoryId(storyId) ? await fetchStory(storyId) : undefined;

  if (story === undefined) {
    return { title: "Story not found" };
  }

  const [analysis, claims] = await Promise.all([
    fetchStoryAnalysis(storyId),
    fetchStoryClaims(storyId),
  ]);

  return { title: `Editing: ${pageTitle(story, analysis, claims)}` };
}

/** One story's corrections: relevance, its analysis's review, its articles. */
export default async function EditorStoryPage({
  params,
  searchParams,
}: EditorStoryPageProps) {
  const { storyId } = await params;
  const movedTo = param(await searchParams, "movedTo");
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

  const sources: Record<string, Source> = Object.fromEntries(
    articles.map((article) => [
      article.id,
      { name: article.sourceName ?? "Unknown outlet", url: article.url },
    ]),
  );
  const flagged = new Set(story.rating?.differentEventArticleIds ?? []);
  const singleSource = isSingleSource(story.articleCount, claims);

  return (
    <>
      <SiteHeader section="editor" />
      <main className={styles.main}>
        <Link
          href={dayHref(story.category, story.publishedDate, "/editor")}
          className={styles.back}
        >
          ← {categoryLabel(story.category)}, {formatDay(story.publishedDate)}
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>
            Editing ·{" "}
            {story.isRelevant === null
              ? "not rated yet"
              : story.isRelevant
                ? `relevant, number ${story.rank} of ${story.relevantThatDay}`
                : "not relevant"}
          </p>
          <h1 className={styles.title}>{pageTitle(story, analysis, claims)}</h1>
          <p className={styles.meta}>
            {count(story.articleCount, "article")} from{" "}
            {count(story.sourceCount, "outlet")} ·{" "}
            <Link href={`/stories/${story.id}`}>See it as readers do</Link>
          </p>
        </header>

        {movedTo !== undefined && isStoryId(movedTo) && (
          <Notice>
            <p>
              {movedTo === story.id ? (
                "The article was moved into this story. It's listed below."
              ) : (
                <>
                  The article was moved to{" "}
                  <Link href={`/editor/stories/${movedTo}`}>its new story</Link>.
                </>
              )}
            </p>
          </Notice>
        )}

        <StoryNotices story={story} analysis={analysis} articles={articles} />

        <RelevancePanel story={story} />

        {analysis && (
          <section className={styles.section} aria-labelledby="analysis">
            <h2 id="analysis" className={styles.sectionTitle}>
              Analysis
            </h2>
            <dl className={styles.analysis}>
              <div>
                <dt>Headline</dt>
                <dd>
                  {analysis.headline}
                  {singleSource && (
                    <span className={styles.muted}>
                      {" "}
                      Readers see the outlet's own headline instead, since the
                      story has a single source.
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Summary</dt>
                <dd>{analysis.summary}</dd>
              </div>
            </dl>
            {claims.length > 0 && (
              <div className={styles.claims}>
                <ClaimList
                  claims={claims}
                  sources={sources}
                  grouped={!singleSource}
                  idPrefix="review-claims"
                />
              </div>
            )}
            <AnalysisPanel storyId={story.id} analysis={analysis} />
          </section>
        )}

        <section className={styles.section} aria-labelledby="articles">
          <h2 id="articles" className={styles.sectionTitle}>
            Articles
          </h2>
          <ArticleList
            articles={articles}
            edit={{ storyId: story.id, flagged, targets: otherStories }}
          />
        </section>
      </main>
    </>
  );
}

/** What needs an editor's attention: what's flagged, rejected or stale. */
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
            {analysis.reviewNote ? `: ${analysis.reviewNote}` : "."} Readers
            don't see its claims until it's analyzed again or the review is
            cleared.
          </p>
        </Notice>
      )}
      {analysis && !analysis.isCurrent && (
        <Notice tone="warning">
          <p>
            The story's articles have changed since it was analyzed.{" "}
            {story.isRelevant ? (
              <>
                Run <code>analyze_gnews.py</code> for {story.publishedDate} to
                refresh it.
              </>
            ) : (
              "Only relevant stories are analyzed, so it won't be refreshed unless it's marked relevant."
            )}
          </p>
        </Notice>
      )}
      {story.isRelevant === null && (
        <Notice>
          <p>
            Not rated yet. Run <code>rate_gnews.py</code> for {story.publishedDate}.
          </p>
        </Notice>
      )}
      {analysis === undefined && story.isRelevant === true && (
        <Notice>
          <p>
            Not analyzed yet. Story analysis covers each day's top-ranked
            relevant stories; run <code>analyze_gnews.py</code> for{" "}
            {story.publishedDate} with a higher <code>--limit</code> to include
            this one.
          </p>
        </Notice>
      )}
      {analysis === undefined && story.isRelevant === false && (
        <Notice>
          <p>Not analyzed: only relevant stories are.</p>
        </Notice>
      )}
    </>
  );
}
