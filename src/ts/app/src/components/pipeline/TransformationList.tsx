import type { Transformation } from "@bsotd/pipeline/core";

import { StatusBadge } from "./StatusBadge";
import styles from "./TransformationList.module.css";

export function TransformationList({
  transformations,
}: {
  transformations: Transformation[];
}) {
  return (
    <ol className={styles.list}>
      {transformations.map((transformation) => (
        <li key={transformation.name} className={styles.item}>
          <div className={styles.heading}>
            <h3 className={styles.name}>{transformation.name}</h3>
            <StatusBadge status={transformation.status} />
          </div>
          <p className={styles.description}>{transformation.description}</p>
          {transformation.implementedIn && (
            <ul className={styles.files} aria-label="Implemented in">
              {transformation.implementedIn.map((path) => (
                <li key={path}>
                  <code>{path}</code>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
