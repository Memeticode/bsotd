import type { StoryAnalysis } from "@/lib/stories";
import { ReviewVerdict, formatMoment } from "@/lib/story-display";
import { ReviewForm } from "./ReviewForm";
import styles from "./EditorialPanel.module.css";

/** Where the analysis came from, and editors' verdict on it. */
export function AnalysisPanel({
  storyId,
  analysis,
}: {
  storyId: string;
  analysis: StoryAnalysis;
}) {
  const tokens = (value: number) => value.toLocaleString("en-US");

  return (
    <section className={styles.panel} aria-labelledby="analysis-review">
      <h3 id="analysis-review" className={styles.heading}>
        Analysis
      </h3>
      <p className={styles.muted}>
        {analysis.model}, prompt {analysis.promptVersion},{" "}
        {formatMoment(analysis.createdAt)} · {tokens(analysis.inputTokens)}{" "}
        tokens in, {tokens(analysis.outputTokens)} out
      </p>
      {analysis.reviewVerdict !== null && analysis.reviewedAt !== null && (
        <p>
          {analysis.reviewVerdict === ReviewVerdict.Approved
            ? "Approved"
            : "Rejected"}{" "}
          by an editor, {formatMoment(analysis.reviewedAt)}
          {analysis.reviewNote && `: ${analysis.reviewNote}`}
        </p>
      )}
      <ReviewForm
        storyId={storyId}
        analysisId={analysis.id}
        verdict={analysis.reviewVerdict}
        note={analysis.reviewNote}
      />
    </section>
  );
}
