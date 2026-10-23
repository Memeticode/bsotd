import type { Metadata } from "next";
import { jobsPipeline } from "@bsotd/pipeline";
import { jobStatus, Status } from "@bsotd/pipeline/core";

import { StatusBadge } from "@/components/pipeline/StatusBadge";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelineOverviewPage() {
  const statuses = jobsPipeline.jobs.map((job) => jobStatus(job));
  const jobsWith = (status: Status) => {
    const count = statuses.filter((s) => s === status).length;
    return `${count} ${count === 1 ? "job" : "jobs"}`;
  };

  return (
    <article className={styles.overview}>
      <h1 className={styles.title}>{jobsPipeline.name}</h1>
      <p className={styles.description}>{jobsPipeline.description}</p>

      <ul className={styles.counts} aria-label="Jobs by status">
        {Object.values(Status).map((status) => (
          <li key={status}>
            <StatusBadge status={status} /> {jobsWith(status)}
          </li>
        ))}
      </ul>

      <p className={styles.hint}>
        Select a job in the graph to see its inputs, steps and data.
      </p>

      {jobsPipeline.principles && (
        <section>
          <h2 className={styles.heading}>Guiding principles</h2>
          <ol className={styles.principles}>
            {jobsPipeline.principles.map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
