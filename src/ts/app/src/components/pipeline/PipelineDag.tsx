import {
  Status,
  stepEdges,
  stepStatus,
  type Pipeline,
} from "@bsotd/pipeline/core";

import { layoutDag } from "@/components/dag/dag-layout";
import { PipelineDagClient, type DagStep } from "./PipelineDagClient";
import { StatusBadge } from "./StatusBadge";
import styles from "./PipelineDag.module.css";

/** The pipeline's steps as a graph, with a legend for their statuses. */
export function PipelineDag({ pipeline }: { pipeline: Pipeline }) {
  const steps: DagStep[] = pipeline.steps.map((step) => ({
    id: step.id,
    name: step.name,
    kind: step.kind,
    status: stepStatus(step),
  }));

  const layout = layoutDag(
    steps.map((step) => step.id),
    stepEdges(pipeline),
  );

  return (
    <div className={styles.graph}>
      <PipelineDagClient steps={steps} layout={layout} />
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
