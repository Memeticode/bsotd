import type { ReactNode } from "react";
import type { Status } from "@bsotd/pipeline/core";

import { Tag } from "@/components/ui/Tag";
import { StatusBadge } from "./StatusBadge";
import styles from "./WorkCard.module.css";

interface WorkCardProps {
  title: string;
  /** e.g. the step's kind. */
  tag?: string;
  status: Status;
  description: string;
  implementedIn?: string[];
  /** Extra detail shown last, such as a view's SQL. */
  children?: ReactNode;
}

/** A unit of work, such as a job or a SQL step: what it does and where its code lives. */
export function WorkCard({
  title,
  tag,
  status,
  description,
  implementedIn,
  children,
}: WorkCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.heading}>
        <h3 className={styles.title}>{title}</h3>
        {tag && <Tag>{tag}</Tag>}
        <StatusBadge status={status} />
      </div>
      <p className={styles.description}>{description}</p>
      {implementedIn && (
        <ul className={styles.files} aria-label="Implemented in">
          {implementedIn.map((path) => (
            <li key={path}>
              <code>{path}</code>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
