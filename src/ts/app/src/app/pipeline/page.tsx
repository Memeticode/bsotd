import type { Metadata } from "next";
import { newsPipeline } from "@bsotd/pipeline";
import { Status, stepStatus } from "@bsotd/pipeline/core";

import { StatusBadge } from "@/components/pipeline/StatusBadge";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelineOverviewPage() {
  const statuses = newsPipeline.steps.map((step) => stepStatus(step));
  const stepsWith = (status: Status) =>
    statuses.filter((s) => s === status).length;

  return (
    <article className={styles.overview}>
      <h1 className={styles.title}>{newsPipeline.name}</h1>
      <p className={styles.description}>{newsPipeline.description}</p>

      <ul className={styles.counts} aria-label="Steps by status">
        {Object.values(Status).map((status) => (
          <li key={status}>
            <StatusBadge status={status} /> {stepsWith(status)} steps
          </li>
        ))}
      </ul>

      <p className={styles.hint}>
        Select a step in the graph to see its transformations and output data.
      </p>

      {newsPipeline.principles && (
        <section>
          <h2 className={styles.heading}>Guiding principles</h2>
          <ol className={styles.principles}>
            {newsPipeline.principles.map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
