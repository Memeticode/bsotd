import { labelSources, type Source } from "@/lib/story-display";
import { SourceLink } from "./SourceLink";
import styles from "./StorySources.module.css";

interface StorySourcesProps {
  sources: Source[];
  className?: string;
}

/** Every outlet carrying a story, each linking to its copy. */
export function StorySources({ sources, className }: StorySourcesProps) {
  if (sources.length === 0) {
    return null;
  }

  const label = sources.length === 1 ? "Source" : "Sources";

  return (
    <div className={className ? `${styles.sources} ${className}` : styles.sources}>
      <span className={styles.label} aria-hidden="true">
        {label}
      </span>
      <ul className={styles.list} aria-label={label}>
        {labelSources(sources).map((source, index) => (
          <li key={index}>
            <SourceLink source={source} className={styles.link}>
              {source.label}
            </SourceLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
