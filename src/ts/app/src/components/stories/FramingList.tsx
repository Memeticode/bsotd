import type { StoryAnalysis } from "@/lib/stories";
import type { Source } from "@/lib/story-display";
import { SourceLink, SourceLinkList } from "./SourceLink";
import styles from "./FramingList.module.css";

interface FramingListProps {
  analysis: StoryAnalysis;
  /** The outlet behind each article, and its link, by article ID. */
  sources: Record<string, Source>;
}

/** How each outlet frames the story, and which ran the same report. */
export function FramingList({ analysis, sources }: FramingListProps) {
  const source = (articleId: string): Source =>
    sources[articleId] ?? { name: "An article since moved", url: null };

  return (
    <>
      <dl className={styles.framing}>
        {analysis.framing.map((note) => (
          <div key={note.articleId} className={styles.note}>
            <dt className={styles.outlet}>
              <SourceLink source={source(note.articleId)} />
            </dt>
            <dd className={styles.text}>{note.framing}</dd>
          </div>
        ))}
      </dl>
      {analysis.syndicatedCopies.length > 0 && (
        <ul className={styles.copies}>
          {analysis.syndicatedCopies.map((group) => (
            <li key={group.articleIds.join()}>
              <SourceLinkList sources={group.articleIds.map(source)} /> ran the
              same report, so count once as a source. {group.basis}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
