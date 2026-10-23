import type { PoolClient } from "pg";

import { getEditorPool } from "./db";
import type {
  AnalysisReview,
  MoveArticle,
  RelevanceOverride,
} from "./editorial-input";

// Saves editors' corrections. Each takes effect at once, and the jobs keep
// them: story clustering replays moved articles, the ranking prefers editors'
// ratings, and analyses carry their reviews.

/** A correction that can't be made, with a message for the editor. */
export class EditorialError extends Error {}

export interface MovedArticle {
  /** Where the article is now. */
  storyId: string;
  /** Whether the story it left had no other articles and is gone. */
  previousStoryRemoved: boolean;
}

/**
 * Moves an article to another of its day's stories, or into a new story of
 * its own, and records the move so the next clustering run replays it.
 */
export async function moveArticle(move: MoveArticle): Promise<MovedArticle> {
  return transaction(async (client) => {
    const current = await client.query<{
      storyId: string;
      category: string;
      publishedDate: string;
      articleCount: number;
    }>(
      `SELECT
         s.id AS "storyId",
         s.category,
         s.published_date AS "publishedDate",
         (SELECT count(*)::int FROM news.gnews_story_article o
          WHERE o.story_id = s.id) AS "articleCount"
       FROM news.gnews_story_article sa
       JOIN news.gnews_story s ON s.id = sa.story_id
       WHERE sa.gnews_article_id = $1
       FOR UPDATE OF s`,
      [move.articleId],
    );

    const from = current.rows[0];

    if (from === undefined || from.storyId !== move.fromStoryId) {
      throw new EditorialError(
        "The article has moved since this page loaded. Reload it and try again.",
      );
    }

    let toStoryId: string;
    let togetherWith: string | null;

    if (move.toStoryId === null) {
      if (from.articleCount === 1) {
        throw new EditorialError("The article is already a story of its own.");
      }

      const created = await client.query<{ id: string }>(
        `INSERT INTO news.gnews_story (
           category, published_date,
           clustering_method, clustering_version, clustering_metadata
         )
         SELECT category, published_date,
                clustering_method, clustering_version,
                jsonb_build_object('created_by', 'editor')
         FROM news.gnews_story
         WHERE id = $1
         RETURNING id`,
        [from.storyId],
      );

      toStoryId = created.rows[0]!.id;
      togetherWith = null;
    } else {
      // Any article already in the target story anchors the move, so the
      // clustering job can replay it whatever IDs stories get.
      const target = await client.query<{ anchor: string | null }>(
        `SELECT
           (SELECT min(gnews_article_id) FROM news.gnews_story_article
            WHERE story_id = s.id) AS anchor
         FROM news.gnews_story s
         WHERE s.id = $1 AND s.category = $2 AND s.published_date = $3
         FOR UPDATE`,
        [move.toStoryId, from.category, from.publishedDate],
      );

      const anchor = target.rows[0]?.anchor;

      if (anchor === undefined || anchor === null) {
        throw new EditorialError("That story isn't one of the article's day.");
      }

      toStoryId = move.toStoryId;
      togetherWith = anchor;
    }

    await client.query(
      `UPDATE news.gnews_story_article
       SET story_id = $2, assigned_by = 'editor'
       WHERE gnews_article_id = $1`,
      [move.articleId, toStoryId],
    );

    await client.query(
      `UPDATE news.gnews_story SET updated_at = now() WHERE id = ANY($1)`,
      [[from.storyId, toStoryId]],
    );

    // Deleting an emptied story also deletes its ratings and analyses.
    const removed = await client.query(
      `DELETE FROM news.gnews_story s
       WHERE s.id = $1
         AND NOT EXISTS (
           SELECT 1 FROM news.gnews_story_article sa WHERE sa.story_id = s.id
         )`,
      [from.storyId],
    );

    await client.query(
      `INSERT INTO news.gnews_story_article_override (
         gnews_article_id, together_with_article_id, note
       )
       VALUES ($1, $2, $3)
       ON CONFLICT (gnews_article_id) DO UPDATE
       SET together_with_article_id = EXCLUDED.together_with_article_id,
           note = EXCLUDED.note,
           created_at = now()`,
      [move.articleId, togetherWith, move.note],
    );

    return { storyId: toStoryId, previousStoryRemoved: removed.rowCount === 1 };
  });
}

/** Rates a story in place of the model; the model's ratings are kept. */
export async function saveRelevanceOverride(
  override: RelevanceOverride,
): Promise<void> {
  await getEditorPool().query(
    `INSERT INTO news.gnews_story_relevance_override (
       story_id, category_relevance, importance, note
     )
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (story_id) DO UPDATE
     SET category_relevance = EXCLUDED.category_relevance,
         importance = EXCLUDED.importance,
         note = EXCLUDED.note,
         created_at = now()`,
    [override.storyId, override.categoryRelevance, override.importance, override.note],
  );
}

/** Goes back to the model's rating. */
export async function clearRelevanceOverride(storyId: string): Promise<void> {
  await getEditorPool().query(
    `DELETE FROM news.gnews_story_relevance_override WHERE story_id = $1`,
    [storyId],
  );
}

export async function saveAnalysisReview(review: AnalysisReview): Promise<void> {
  const saved = await getEditorPool().query(
    `INSERT INTO news.gnews_story_analysis_review (analysis_id, verdict, note)
     SELECT id, $3, $4
     FROM news.gnews_story_analysis
     WHERE id = $2 AND story_id = $1
     ON CONFLICT (analysis_id) DO UPDATE
     SET verdict = EXCLUDED.verdict,
         note = EXCLUDED.note,
         reviewed_at = now()`,
    [review.storyId, review.analysisId, review.verdict, review.note],
  );

  if (saved.rowCount === 0) {
    throw new EditorialError("That analysis isn't this story's.");
  }
}

export async function clearAnalysisReview(analysisId: string): Promise<void> {
  await getEditorPool().query(
    `DELETE FROM news.gnews_story_analysis_review WHERE analysis_id = $1`,
    [analysisId],
  );
}

async function transaction<Result>(
  work: (client: PoolClient) => Promise<Result>,
): Promise<Result> {
  const client = await getEditorPool().connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
