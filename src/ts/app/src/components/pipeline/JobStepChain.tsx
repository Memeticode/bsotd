import { Suspense } from "react";
import { DatasetKind, type PipelineJob } from "@bsotd/pipeline/core";

import type { Paging } from "@/lib/pagination";
import { DatasetSection } from "./DatasetSection";
import { JOB_STEP_KIND_LABELS } from "./labels";
import { ViewDefinition } from "./ViewDefinition";
import { WorkCard } from "./WorkCard";
import styles from "./JobStepChain.module.css";

interface JobStepChainProps {
  job: PipelineJob;
  /** Jobs that read this job's outputs. */
  readBy: PipelineJob[];
  paging: Paging;
}

/**
 * A job's steps in order, each followed by the data it produces. The last
 * step's data is the job's output.
 */
export function JobStepChain({ job, readBy, paging }: JobStepChainProps) {
  const lastIndex = job.steps.length - 1;

  return (
    <ol className={styles.chain}>
      {job.steps.map((step, index) => (
        <li key={step.name} className={styles.link}>
          <WorkCard
            title={step.name}
            tag={JOB_STEP_KIND_LABELS[step.kind]}
            status={step.status}
            description={step.description}
            implementedIn={step.implementedIn}
          >
            {step.produces
              .filter((dataset) => dataset.kind === DatasetKind.View)
              .map((view) => (
                <Suspense key={view.name} fallback={null}>
                  <ViewDefinition name={view.name} />
                </Suspense>
              ))}
          </WorkCard>
          {step.produces.map((dataset) => (
            <div key={dataset.name} className={styles.produced}>
              <DatasetSection
                dataset={dataset}
                paging={paging}
                readBy={index === lastIndex ? readBy : undefined}
              />
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}
