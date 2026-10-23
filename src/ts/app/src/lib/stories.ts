import { connection } from "next/server";
import type { QueryResultRow } from "pg";
import { cache } from "react";

import { getPool } from "./db";
import type { Agreement, ClaimKind, ReviewVerdict, Stance } from "./story-display";

// Reads for the story pages, from the jobs' views. Story and article IDs are
// bigints, which node-postgres returns as strings, so they're strings here
// too, including those read from the analyses' JSON.

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
  articleCount: number;
  sourceCount: number;
  sourceNames: string[];
  firstPublishedAt: Date;
  /** Editors' where given, otherwise the model's; null until rated. */
  categoryRelevance: number | null;
  importance: number | null;
  fitsCategory: boolean | null;
  ratedByEditor: boolean;
  headline: string | null;
  summary: string | null;
  takeaways: string[];
  reviewVerdict: ReviewVerdict | null;
  claimCount: number;
  corroboratedCount: number;
  disputedCount: number;
}

export interface StoryDetail {
  id: string;
  category: string;
  publishedDate: string;
  rank: number;
  storiesThatDay: number;
  leadTitle: string | null;
  leadDescription: string | null;
  articleCount: number;
  sourceCount: number;
  sourceNames: string[];
  firstPublishedAt: Date;
  lastPublishedAt: Date;
  edited: boolean;
  clusteringMethod: string;
  clusteringVersion: string;
  categoryRelevance: number | null;
  importance: number | null;
  fitsCategory: boolean | null;
  /** The model's latest rating, if it has rated the story. */
  rating: ModelRating | null;
  editorRating: EditorRating | null;
}

export interface ModelRating {
  model: string;
  criteriaVersion: string;
  categoryRelevance: number;
  importance: number;
  rationale: string;
  ratedAt: Date;
  /** False when the story's articles changed after rating. */
  isCurrent: boolean;
  /** Articles judged to report a different event from the rest. */
  differentEventArticleIds: string[];
}

export interface EditorRating {
  categoryRelevance: number;
  importance: number;
  note: string | null;
}

export interface StoryAnalysis {
  id: string;
  headline: string;
  summary: string;
  takeaways: string[];
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
export function fetchFeed(category: string, publishedDate: string): Promise<FeedStory[]> {
  return query<FeedStory>(
    `WITH claim_count AS (
       SELECT
         story_id,
         count(*)::int AS claims,
         count(*) FILTER (WHERE agreement = 'corroborated')::int AS corroborated,
         count(*) FILTER (WHERE agreement = 'disputed')::int AS disputed
       FROM news.v_gnews_story_claim
       GROUP BY story_id
     )
     SELECT
       s.id,
       s.relevance_rank AS rank,
       s.lead_title AS "leadTitle",
       s.lead_description AS "leadDescription",
       s.article_count AS "articleCount",
       s.source_count AS "sourceCount",
       s.source_names AS "sourceNames",
       s.first_published_at AS "firstPublishedAt",
       s.category_relevance AS "categoryRelevance",
       s.importance,
       s.fits_category AS "fitsCategory",
       s.editor_importance IS NOT NULL AS "ratedByEditor",
       a.headline,
       a.summary,
       COALESCE(a.takeaways, '{}') AS takeaways,
       a.review_verdict AS "reviewVerdict",
       COALESCE(c.claims, 0) AS "claimCount",
       COALESCE(c.corroborated, 0) AS "corroboratedCount",
       COALESCE(c.disputed, 0) AS "disputedCount"
     FROM news.v_gnews_story_ranked s
     LEFT JOIN news.v_gnews_story_analysis a ON a.story_id = s.id
     LEFT JOIN claim_count c ON c.story_id = s.id
     WHERE s.category = $1 AND s.published_date = $2
     ORDER BY s.relevance_rank`,
    [category, publishedDate],
  );
}

interface StoryRow extends Omit<StoryDetail, "rating" | "editorRating"> {
  // The model's rating: all null until the story is rated.
  ratingModel: string | null;
  criteriaVersion: string | null;
  modelCategoryRelevance: number | null;
  modelImportance: number | null;
  rationale: string | null;
  ratedAt: Date | null;
  ratingIsCurrent: boolean | null;
  differentEventArticleIds: string[] | null;
  // An editor's rating: all null unless an editor rated the story.
  editorCategoryRelevance: number | null;
  editorImportance: number | null;
  editorNote: string | null;
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
       (SELECT count(*)::int FROM news.gnews_story d
        WHERE d.category = s.category AND d.published_date = s.published_date)
         AS "storiesThatDay",
       s.lead_title AS "leadTitle",
       s.lead_description AS "leadDescription",
       s.article_count AS "articleCount",
       s.source_count AS "sourceCount",
       s.source_names AS "sourceNames",
       s.first_published_at AS "firstPublishedAt",
       s.last_published_at AS "lastPublishedAt",
       s.edited,
       s.clustering_method AS "clusteringMethod",
       s.clustering_version AS "clusteringVersion",
       s.category_relevance AS "categoryRelevance",
       s.importance,
       s.fits_category AS "fitsCategory",
       s.relevance_model AS "ratingModel",
       s.relevance_criteria_version AS "criteriaVersion",
       s.model_category_relevance AS "modelCategoryRelevance",
       s.model_importance AS "modelImportance",
       s.relevance_rationale AS rationale,
       s.rated_at AS "ratedAt",
       s.rating_is_current AS "ratingIsCurrent",
       s.different_event_article_ids AS "differentEventArticleIds",
       s.editor_category_relevance AS "editorCategoryRelevance",
       s.editor_importance AS "editorImportance",
       s.editor_note AS "editorNote"
     FROM news.v_gnews_story_ranked s
     WHERE s.id = $1`,
    [id],
  );

  if (row === undefined) {
    return undefined;
  }

  const {
    ratingModel,
    criteriaVersion,
    modelCategoryRelevance,
    modelImportance,
    rationale,
    ratedAt,
    ratingIsCurrent,
    differentEventArticleIds,
    editorCategoryRelevance,
    editorImportance,
    editorNote,
    ...story
  } = row;

  return {
    ...story,
    rating:
      ratingModel === null
        ? null
        : {
            model: ratingModel,
            criteriaVersion: criteriaVersion!,
            categoryRelevance: modelCategoryRelevance!,
            importance: modelImportance!,
            rationale: rationale!,
            ratedAt: ratedAt!,
            isCurrent: ratingIsCurrent!,
            differentEventArticleIds: differentEventArticleIds ?? [],
          },
    editorRating:
      editorCategoryRelevance === null
        ? null
        : {
            categoryRelevance: editorCategoryRelevance,
            importance: editorImportance!,
            note: editorNote,
          },
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
       takeaways,
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

export async function fetchStoryClaims(storyId: string): Promise<StoryClaim[]> {
  const rows = await query<
    Omit<StoryClaim, "sources"> & {
      sources: { article_id: number; stance: Stance; evidence: string }[];
    }
  >(
    `SELECT
       claim_number AS number,
       statement,
       kind,
       agreement,
       supporting_reports AS "supportingReports",
       contradicting_reports AS "contradictingReports",
       sources,
       not_mentioned_article_ids AS "notMentionedArticleIds"
     FROM news.v_gnews_story_claim
     WHERE story_id = $1
     ORDER BY claim_number`,
    [storyId],
  );

  return rows.map((row) => ({
    ...row,
    sources: row.sources.map((source) => ({
      articleId: String(source.article_id),
      stance: source.stance,
      evidence: source.evidence,
    })),
  }));
}

/** A story's articles, earliest first. */
export function fetchStoryArticles(storyId: string): Promise<StoryArticle[]> {
  return query<StoryArticle>(
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
}

/** The day's other stories, in rank order, titled as the feed titles them. */
export function fetchOtherStories(story: StoryDetail): Promise<StoryOption[]> {
  return query<StoryOption>(
    `SELECT
       s.id,
       COALESCE(
         CASE WHEN a.review_verdict IS DISTINCT FROM 'rejected' THEN a.headline END,
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
