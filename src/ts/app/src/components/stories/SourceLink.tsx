import { Fragment, type ReactNode } from "react";

import type { Source } from "@/lib/story-display";

interface SourceLinkProps {
  source: Source;
  /** What the link says: the outlet's name unless given. */
  children?: ReactNode;
  className?: string;
}

/** An outlet's name, linking to its copy of the article where there's one. */
export function SourceLink({ source, children, className }: SourceLinkProps) {
  const label = children ?? source.name;

  return source.url ? (
    <a href={source.url} className={className} target="_blank" rel="noreferrer">
      {label}
    </a>
  ) : (
    <span className={className}>{label}</span>
  );
}

/** e.g. "CNN, KOCO and WMUR", each linking to its copy. */
export function SourceLinkList({
  sources,
  className,
}: {
  sources: Source[];
  className?: string;
}) {
  return sources.map((source, index) => (
    <Fragment key={index}>
      {index > 0 && (index === sources.length - 1 ? " and " : ", ")}
      <SourceLink source={source} className={className} />
    </Fragment>
  ));
}
