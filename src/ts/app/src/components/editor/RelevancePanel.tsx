import type { StoryDetail } from "@/lib/stories";
import { categoryLabel, formatMoment } from "@/lib/story-display";
import { RelevanceForm } from "./RelevanceForm";
import styles from "./EditorialPanel.module.css";

/** Whether the story is relevant and who decided, with the model's reasons. */
export function RelevancePanel({ story }: { story: StoryDetail }) {
  const { rating, editorVerdict } = story;

  return (
    <section className={styles.panel} aria-labelledby="relevance">
      <h3 id="relevance" className={styles.heading}>
        Relevance
      </h3>

      {story.isRelevant !== null ? (
        <dl className={styles.scores}>
          <div>
            <dt>Verdict</dt>
            <dd>{story.isRelevant ? "Relevant" : "Not relevant"}</dd>
          </div>
          <div>
            <dt>Decided by</dt>
            <dd>{editorVerdict ? "An editor" : "The model"}</dd>
          </div>
        </dl>
      ) : (
        <p className={styles.muted}>
          Not rated yet. Run <code>rate_gnews.py</code> for {story.publishedDate}.
        </p>
      )}

      {editorVerdict?.note && <p>Editor's note: {editorVerdict.note}</p>}

      {rating && (
        <div className={styles.modelRating}>
          <p>
            The model rated its fit with {categoryLabel(story.category)}{" "}
            {rating.categoryRelevance} of 5 and its importance {rating.importance}{" "}
            of 5, so {rating.isRelevant ? "relevant" : "not relevant"}: a
            relevant story needs 3 or more on both.
          </p>
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
        isRelevant={story.isRelevant}
        note={editorVerdict?.note ?? null}
        editorDecided={editorVerdict !== null}
      />
    </section>
  );
}
