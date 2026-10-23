import type { StoryDetail } from "@/lib/stories";
import {
  CATEGORY_RELEVANCE_LABELS,
  IMPORTANCE_LABELS,
  categoryLabel,
  formatMoment,
  scoreLabel,
} from "@/lib/story-display";
import { RelevanceForm } from "./RelevanceForm";
import styles from "./EditorialPanel.module.css";

/** The story's ratings: the one in effect, the model's, and an editor's. */
export function RelevancePanel({ story }: { story: StoryDetail }) {
  const { rating, editorRating } = story;
  const category = categoryLabel(story.category);

  return (
    <section className={styles.panel} aria-labelledby="relevance">
      <h3 id="relevance" className={styles.heading}>
        Relevance
      </h3>

      {story.importance !== null && story.categoryRelevance !== null ? (
        <dl className={styles.scores}>
          <div>
            <dt>Importance</dt>
            <dd>{scoreLabel(IMPORTANCE_LABELS, story.importance)}</dd>
          </div>
          <div>
            <dt>Fit with {category}</dt>
            <dd>{scoreLabel(CATEGORY_RELEVANCE_LABELS, story.categoryRelevance)}</dd>
          </div>
          <div>
            <dt>Rated by</dt>
            <dd>{editorRating ? "An editor" : "The model"}</dd>
          </div>
        </dl>
      ) : (
        <p className={styles.muted}>
          Not rated yet. Run <code>rate_gnews.py</code> for {story.publishedDate}.
        </p>
      )}

      {editorRating?.note && <p>Editor's note: {editorRating.note}</p>}

      {rating && (
        <div className={styles.modelRating}>
          {editorRating && (
            <p>
              The model's rating: importance{" "}
              {scoreLabel(IMPORTANCE_LABELS, rating.importance)}, fit{" "}
              {scoreLabel(CATEGORY_RELEVANCE_LABELS, rating.categoryRelevance)}.
            </p>
          )}
          <p>{rating.rationale}</p>
          <p className={styles.muted}>
            {rating.model}, rubric {rating.criteriaVersion},{" "}
            {formatMoment(rating.ratedAt)}
            {!rating.isCurrent && " · rated before the story's articles last changed"}
          </p>
        </div>
      )}

      <RelevanceForm
        storyId={story.id}
        categoryRelevance={story.categoryRelevance}
        importance={story.importance}
        note={editorRating?.note ?? null}
        editorRated={editorRating !== null}
      />
    </section>
  );
}
