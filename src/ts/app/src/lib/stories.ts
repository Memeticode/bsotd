import { connection } from "next/server";
import type { QueryResultRow } from "pg";
import { cache } from "react";

import { getPool } from "./db";
import {
  webUrl,
  type Agreement,
  type ClaimKind,
  type ReviewVerdict,
  type Source,
  type Stance,
} from "./story-display";

// Reads for the story pages, from the jobs' views. Story and article IDs are
// bigints, which node-postgres returns as strings, so they're strings here
// too, including those read from the analyses' JSON. Links come from the
// outlets' feeds, so only web addresses are kept.

/** A category and day with stories. */
export interface StoryDay {
  category: string;
  /** YYYY-MM-DD */
  publishedDate: string;
  storyCount: number;
}

/** What the day's feed shows of a story. */
export interface FeedStory {
  id: string;
  rank: number;
  leadTitle: string | null;
  leadDescription: string | null;
  /** The lead article's image, and the outlet it's from. */
  imageUrl: string | null;
  imageSource: string | null;
  articleCount: number;
  /** Every outlet's copy, syndicated copies included, by outlet. */
  sources: Source[];
  /** An editor's verdict where given, otherwise the model's; null until rated. */
  isRelevant: boolean | null;
  headline: string | null;
  summary: string | null;
  reviewVerdict: ReviewVerdict | null;
}

export interface StoryDetail {
  id: string;
  category: string;
  publishedDate: string;
  rank: number;
  /** How many of the day's stories are relevant. */
  relevantThatDay: number;
  leadTitle: string | null;
  leadDescription: string | null;
  leadUrl: string | null;
  /** The lead article's image, and the outlet it's from. */
  imageUrl: string | null;
  imageSource: string | null;
  articleCount: number;
  sourceCount: number;
  /** Every outlet's copy, syndicated copies included, by outlet. */
  sources: Source[];
  firstPublishedAt: Date;
  lastPublishedAt: Date;
  edited: boolean;
  clusteringMethod: string;
  clusteringVersion: string;
  /** An editor's verdict where given, otherwise the model's; null until rated. */
  isRelevant: boolean | null;
  /** The model's latest rating, if it has rated the story. */
  rating: ModelRating | null;
  editorVerdict: EditorVerdict | null;
}

export interface ModelRating {
  model: string;
  criteriaVersion: string;
  categoryRelevance: number;
  importance: number;
  /** Whether the model's scores make the story relevant. */
  isRelevant: boolean;
  rationale: string;
  ratedAt: Date;
  /** False when the story's articles changed after rating. */
  isCurrent: boolean;
  /** Articles judged to report a different event from the rest. */
  differentEventArticleIds: string[];
}

/** An editor's call on whether the story is relevant. */
export interface EditorVerdict {
  isRelevant: boolean;
  note: string | null;
}

export interface StoryAnalysis {
  id: string;
  headline: string;
  summary: string;
  syndicatedCopies: { articleIds: string[]; basis: string }[];
  framing: { articleId: string; framing: string }[];
  /** False when the story's articles changed after analysis. */
  isCurrent: boolean;
  reviewVerdict: ReviewVerdict | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: Date;
}

export interface StoryClaim {
  number: number;
  statement: string;
  kind: ClaimKind;
  agreement: Agreement;
  supportingReports: number;
  contradictingReports: number;
  sources: { articleId: string; stance: Stance; evidence: string }[];
  notMentionedArticleIds: string[];
  /** Article ID -> its report's ID: syndicated copies share one. */
  reportIds: Record<string, string>;
}

/** A claim among a day's, with the story it belongs to. */
export interface DayClaim extends StoryClaim {
  storyId: string;
}

export interface StoryArticle {
  id: string;
  title: string | null;
  description: string | null;
  url: string | null;
  publishedAt: Date | null;
  sourceName: string | null;
  /** Outlets that ran it word for word, its own included. */
  carriedBy: string[];
  assignedBy: "model" | "editor";
}

/** Another story of the same day, which an article could move to. */
export interface StoryOption {
  id: string;
  title: string;
  articleCount: number;
}

async function query<Row extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<Row[]> {
  // Read at request time, never while prerendering.
  await connection();
  return (await getPool().query<Row>(sql, params)).rows;
}

// An outlet's copy as v_gnews_story lists it.
interface SourceRow {
  source_name: string;
  url: string | null;
}

function toSources(rows: SourceRow[]): Source[] {
  return rows.map((row) => ({ name: row.source_name, url: webUrl(row.url) }));
}

/** Every category and day with stories, latest first. */
export function fetchStoryDays(): Promise<StoryDay[]> {
  return query<StoryDay>(
    `SELECT
       category,
       published_date AS "publishedDate",
       count(*)::int AS "storyCount"
     FROM news.gnews_story
     GROUP BY category, published_date
     ORDER BY published_date DESC, category`,
  );
}

/** A day's stories in rank order, with their analyses where there are any. */
export async function fetchFeed(
  category: string,
  publishedDate: string,
): Promise<FeedStory[]> {
  const rows = await query<Omit<FeedStory, "sources"> & { sources: SourceRow[] }>(
    `SELECT
       s.id,
       s.relevance_rank AS rank,
       s.lead_title AS "leadTitle",
       s.lead_description AS "leadDescription",
       s.lead_image_url AS "imageUrl",
       s.lead_source_name AS "imageSource",
       s.article_count AS "articleCount",
       s.sources,
       s.is_relevant AS "isRelevant",
       a.headline,
       a.summary,
       a.review_verdict AS "reviewVerdict"
     FROM news.v_gnews_story_ranked s
     LEFT JOIN news.v_gnews_story_analysis a ON a.story_id = s.id
     WHERE s.category = $1 AND s.published_date = $2
     ORDER BY s.relevance_rank`,
    [category, publishedDate],
  );

  return rows.map((row) => ({
    ...row,
    imageUrl: webUrl(row.imageUrl),
    sources: toSources(row.sources),
  }));
}

interface StoryRow
  extends Omit<StoryDetail, "sources" | "rating" | "editorVerdict"> {
  sources: SourceRow[];
  // The model's rating: all null until the story is rated.
  ratingModel: string | null;
  criteriaVersion: string | null;
  categoryRelevance: number | null;
  importance: number | null;
  modelIsRelevant: boolean | null;
  rationale: string | null;
  ratedAt: Date | null;
  ratingIsCurrent: boolean | null;
  differentEventArticleIds: string[] | null;
  // An editor's verdict: null unless an editor has given one.
  editorIsRelevant: boolean | null;
  editorNote: string | null;
}

/** What the editor's day view shows of a story: what's decided and what's left. */
export interface EditorStory {
  id: string;
  rank: number;
  leadTitle: string | null;
  articleCount: number;
  sourceCount: number;
  /** Null until rated. */
  isRelevant: boolean | null;
  /** Whether an editor decided, not the model. */
  relevanceByEditor: boolean;
  rated: boolean;
  /** False when the story's articles changed after rating. */
  ratingIsCurrent: boolean;
  /** Articles still in the story that the model judged to report another event. */
  flaggedArticles: number;
  analyzed: boolean;
  /** False when the story's articles changed after analysis. */
  analysisIsCurrent: boolean;
  headline: string | null;
  reviewVerdict: ReviewVerdict | null;
  claimCount: number;
}

/** A day's stories in rank order, with what editors may need to look at. */
export function fetchEditorQueue(
  category: string,
  publishedDate: string,
): Promise<EditorStory[]> {
  return query<EditorStory>(
    `SELECT
       s.id,
       s.relevance_rank AS rank,
       s.lead_title AS "leadTitle",
       s.article_count AS "articleCount",
       s.source_count AS "sourceCount",
       s.is_relevant AS "isRelevant",
       s.editor_is_relevant IS NOT NULL AS "relevanceByEditor",
       s.rated_at IS NOT NULL AS rated,
       COALESCE(s.rating_is_current, true) AS "ratingIsCurrent",
       cardinality(ARRAY(
         SELECT unnest(s.different_event_article_ids)
         INTERSECT
         SELECT unnest(s.article_ids)
       ))::int AS "flaggedArticles",
       a.id IS NOT NULL AS analyzed,
       COALESCE(a.analysis_is_current, true) AS "analysisIsCurrent",
       a.headline,
       a.review_verdict AS "reviewVerdict",
       (SELECT count(*)::int FROM news.v_gnews_story_claim c
        WHERE c.story_id = s.id) AS "claimCount"
     FROM news.v_gnews_story_ranked s
     LEFT JOIN news.v_gnews_story_analysis a ON a.story_id = s.id
     WHERE s.category = $1 AND s.published_date = $2
     ORDER BY s.relevance_rank`,
    [category, publishedDate],
  );
}

/** Cached per request, since a page and its metadata both need the story. */
export const fetchStory = cache(async function fetchStory(
  id: string,
): Promise<StoryDetail | undefined> {
  const [row] = await query<StoryRow>(
    `SELECT
       s.id,
       s.category,
       s.published_date AS "publishedDate",
       s.relevance_rank AS rank,
       (SELECT count(*)::int FROM news.v_gnews_story_ranked d
        WHERE d.category = s.category
          AND d.published_date = s.published_date
          AND d.is_relevant) AS "relevantThatDay",
       s.lead_title AS "leadTitle",
       s.lead_description AS "leadDescription",
       s.lead_url AS "leadUrl",
       s.lead_image_url AS "imageUrl",
       s.lead_source_name AS "imageSource",
       s.article_count AS "articleCount",
       s.source_count AS "sourceCount",
       s.sources,
       s.first_published_at AS "firstPublishedAt",
       s.last_published_at AS "lastPublishedAt",
       s.edited,
       s.clustering_method AS "clusteringMethod",
       s.clustering_version AS "clusteringVersion",
       s.is_relevant AS "isRelevant",
       s.relevance_model AS "ratingModel",
       s.relevance_criteria_version AS "criteriaVersion",
       s.category_relevance AS "categoryRelevance",
       s.importance,
       s.model_is_relevant AS "modelIsRelevant",
       s.relevance_rationale AS rationale,
       s.rated_at AS "ratedAt",
       s.rating_is_current AS "ratingIsCurrent",
       s.different_event_article_ids AS "differentEventArticleIds",
       s.editor_is_relevant AS "editorIsRelevant",
       s.editor_note AS "editorNote"
     FROM news.v_gnews_story_ranked s
     WHERE s.id = $1`,
    [id],
  );

  if (row === undefined) {
    return undefined;
  }

  const {
    sources,
    ratingModel,
    criteriaVersion,
    categoryRelevance,
    importance,
    modelIsRelevant,
    rationale,
    ratedAt,
    ratingIsCurrent,
    differentEventArticleIds,
    editorIsRelevant,
    editorNote,
    ...story
  } = row;

  return {
    ...story,
    leadUrl: webUrl(story.leadUrl),
    imageUrl: webUrl(story.imageUrl),
    sources: toSources(sources),
    rating:
      ratingModel === null
        ? null
        : {
            model: ratingModel,
            criteriaVersion: criteriaVersion!,
            categoryRelevance: categoryRelevance!,
            importance: importance!,
            isRelevant: modelIsRelevant!,
            rationale: rationale!,
            ratedAt: ratedAt!,
            isCurrent: ratingIsCurrent!,
            differentEventArticleIds: differentEventArticleIds ?? [],
          },
    editorVerdict:
      editorIsRelevant === null
        ? null
        : { isRelevant: editorIsRelevant, note: editorNote },
  };
});

/** Cached per request, since a page and its metadata both need the analysis. */
export const fetchStoryAnalysis = cache(async function fetchStoryAnalysis(
  storyId: string,
): Promise<StoryAnalysis | undefined> {
  const [row] = await query<
    Omit<StoryAnalysis, "syndicatedCopies" | "framing"> & {
      syndicatedCopies: { article_ids: number[]; basis: string }[];
      framing: { article_id: number; framing: string }[];
    }
  >(
    `SELECT
       id,
       headline,
       summary,
       syndicated_copies AS "syndicatedCopies",
       framing,
       analysis_is_current AS "isCurrent",
       review_verdict AS "reviewVerdict",
       review_note AS "reviewNote",
       reviewed_at AS "reviewedAt",
       model,
       prompt_version AS "promptVersion",
       input_tokens AS "inputTokens",
       output_tokens AS "outputTokens",
       created_at AS "createdAt"
     FROM news.v_gnews_story_analysis
     WHERE story_id = $1`,
    [storyId],
  );

  if (row === undefined) {
    return undefined;
  }

  return {
    ...row,
    syndicatedCopies: row.syndicatedCopies.map((group) => ({
      articleIds: group.article_ids.map(String),
      basis: group.basis,
    })),
    framing: row.framing.map((note) => ({
      articleId: String(note.article_id),
      framing: note.framing,
    })),
  };
});

// A claim as v_gnews_story_claim has it, with article IDs in its JSON as
// numbers, as the analysis stores them.
type ClaimRow<Claim extends StoryClaim> = Omit<Claim, "sources" | "reportIds"> & {
  sources: { article_id: number; stance: Stance; evidence: string }[];
  reportIds: Record<string, number>;
};

const CLAIM_COLUMNS = `
  c.claim_number AS number,
  c.statement,
  c.kind,
  c.agreement,
  c.supporting_reports AS "supportingReports",
  c.contradicting_reports AS "contradictingReports",
  c.sources,
  c.not_mentioned_article_ids AS "notMentionedArticleIds",
  c.report_ids AS "reportIds"`;

function toClaim<Claim extends StoryClaim>(row: ClaimRow<Claim>): Claim {
  return {
    ...row,
    sources: row.sources.map((source) => ({
      articleId: String(source.article_id),
      stance: source.stance,
      evidence: source.evidence,
    })),
    reportIds: Object.fromEntries(
      Object.entries(row.reportIds).map(([article, report]) => [
        article,
        String(report),
      ]),
    ),
  } as Claim;
}

/** Cached per request, since a page and its metadata both need the claims. */
export const fetchStoryClaims = cache(async function fetchStoryClaims(
  storyId: string,
): Promise<StoryClaim[]> {
  const rows = await query<ClaimRow<StoryClaim>>(
    `SELECT ${CLAIM_COLUMNS}
     FROM news.v_gnews_story_claim c
     WHERE c.story_id = $1
     ORDER BY c.claim_number`,
    [storyId],
  );

  return rows.map(toClaim);
});

/**
 * The claims of a day's stories, story by story in rank order. Analyses
 * that an editor rejected are left out, as they are on story pages.
 */
export async function fetchDayClaims(
  category: string,
  publishedDate: string,
): Promise<DayClaim[]> {
  const rows = await query<ClaimRow<DayClaim>>(
    `SELECT c.story_id AS "storyId", ${CLAIM_COLUMNS}
     FROM news.v_gnews_story_claim c
     JOIN news.v_gnews_story_ranked s ON s.id = c.story_id
     WHERE s.category = $1
       AND s.published_date = $2
       AND c.review_verdict IS DISTINCT FROM 'rejected'
     ORDER BY s.relevance_rank, c.claim_number`,
    [category, publishedDate],
  );

  return rows.map(toClaim);
}

/** The outlet behind each of a day's articles and its link, by article ID. */
export async function fetchDaySources(
  category: string,
  publishedDate: string,
): Promise<Map<string, Source>> {
  const rows = await query<{ id: string; sourceName: string | null; url: string | null }>(
    `SELECT id, source_name AS "sourceName", url
     FROM news.v_gnews_article_daily
     WHERE category = $1 AND published_date = $2`,
    [category, publishedDate],
  );

  return new Map(
    rows.map((row) => [
      row.id,
      { name: row.sourceName ?? "Unknown outlet", url: webUrl(row.url) },
    ]),
  );
}

/** A story's articles, earliest first. */
export async function fetchStoryArticles(storyId: string): Promise<StoryArticle[]> {
  const rows = await query<StoryArticle>(
    `SELECT
       a.id,
       a.title,
       a.description,
       a.url,
       a.published_at AS "publishedAt",
       a.source_name AS "sourceName",
       COALESCE(a.duplicate_source_names, '{}') AS "carriedBy",
       sa.assigned_by AS "assignedBy"
     FROM news.gnews_story_article sa
     JOIN news.v_gnews_article_daily a ON a.id = sa.gnews_article_id
     WHERE sa.story_id = $1
     ORDER BY a.published_at, a.id`,
    [storyId],
  );

  return rows.map((row) => ({ ...row, url: webUrl(row.url) }));
}

/**
 * The day's other stories, in rank order, titled as the feed titles them: a
 * one-article story by its own headline.
 */
export function fetchOtherStories(story: StoryDetail): Promise<StoryOption[]> {
  return query<StoryOption>(
    `SELECT
       s.id,
       COALESCE(
         CASE
           WHEN s.article_count > 1
            AND a.review_verdict IS DISTINCT FROM 'rejected'
           THEN a.headline
         END,
         s.lead_title,
         'Untitled story'
       ) AS title,
       s.article_count AS "articleCount"
     FROM news.v_gnews_story_ranked s
     LEFT JOIN news.v_gnews_story_analysis a ON a.story_id = s.id
     WHERE s.category = $1 AND s.published_date = $2 AND s.id <> $3
     ORDER BY s.relevance_rank`,
    [story.category, story.publishedDate, story.id],
  );
}
