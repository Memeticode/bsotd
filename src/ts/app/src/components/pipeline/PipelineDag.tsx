import {
  jobEdges,
  jobKind,
  jobStatus,
  Status,
  type Pipeline,
} from "@bsotd/pipeline/core";

import { layoutDag } from "@/components/dag/dag-layout";
import { PipelineDagClient, type DagJob } from "./PipelineDagClient";
import { StatusBadge } from "./StatusBadge";
import styles from "./PipelineDag.module.css";

/** The pipeline's jobs as a graph, with a legend for their statuses. */
export function PipelineDag({ pipeline }: { pipeline: Pipeline }) {
  const jobs: DagJob[] = pipeline.jobs.map((job) => ({
    id: job.id,
    name: job.name,
    kind: jobKind(job),
    status: jobStatus(job),
  }));

  const layout = layoutDag(
    jobs.map((job) => job.id),
    jobEdges(pipeline),
  );

  return (
    <div className={styles.graph}>
      <PipelineDagClient jobs={jobs} layout={layout} />
      <ul className={styles.legend} aria-label="Statuses">
        {Object.values(Status).map((status) => (
          <li key={status}>
            <StatusBadge status={status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
