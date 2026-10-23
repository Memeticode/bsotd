import type { StoryAnalysis } from "@/lib/stories";
import styles from "./FramingList.module.css";

interface FramingListProps {
  analysis: StoryAnalysis;
  /** Outlet name by article ID. */
  outlets: Map<string, string>;
}

/** How each outlet frames the story, and which ran the same report. */
export function FramingList({ analysis, outlets }: FramingListProps) {
  const name = (articleId: string) => outlets.get(articleId) ?? "An article since moved";

  return (
    <>
      <dl className={styles.framing}>
        {analysis.framing.map((note) => (
          <div key={note.articleId} className={styles.note}>
            <dt className={styles.outlet}>{name(note.articleId)}</dt>
            <dd className={styles.text}>{note.framing}</dd>
          </div>
        ))}
      </dl>
      {analysis.syndicatedCopies.length > 0 && (
        <ul className={styles.copies}>
          {analysis.syndicatedCopies.map((group) => (
            <li key={group.articleIds.join()}>
              {group.articleIds.map(name).join(", ")} ran the same report, so
              count once as a source. {group.basis}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
