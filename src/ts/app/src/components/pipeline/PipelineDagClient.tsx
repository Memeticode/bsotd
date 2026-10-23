"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import type { PipelineJobStepKind, Status } from "@bsotd/pipeline/core";

import { Dag } from "@/components/dag/Dag";
import type { DagLayout } from "@/components/dag/dag-layout";
import { JOB_STEP_KIND_LABELS, STATUS_LABELS } from "./labels";
import styles from "./PipelineDagClient.module.css";

export interface DagJob {
  id: string;
  name: string;
  kind: PipelineJobStepKind;
  status: Status;
}

interface PipelineDagClientProps {
  jobs: DagJob[];
  layout: DagLayout;
}

/** Draws each job as a link and highlights the job being viewed. */
export function PipelineDagClient({ jobs, layout }: PipelineDagClientProps) {
  const activeId = useSelectedLayoutSegment();
  const jobsById = new Map(jobs.map((job) => [job.id, job]));

  return (
    <Dag
      layout={layout}
      activeId={activeId}
      renderNode={(id) => {
        const job = jobsById.get(id);
        return job && <JobNode job={job} active={id === activeId} />;
      }}
    />
  );
}

function JobNode({ job, active }: { job: DagJob; active: boolean }) {
  const status = STATUS_LABELS[job.status];

  return (
    <Link
      href={`/pipeline/${job.id}`}
      className={styles.node}
      data-status={job.status}
      aria-current={active ? "page" : undefined}
      title={`${job.name} (${status})`}
    >
      <span className={styles.meta}>
        {JOB_STEP_KIND_LABELS[job.kind]}
        <span className={styles.dot} aria-hidden="true" />
      </span>
      <span className={styles.name}>{job.name}</span>
      <span className="visually-hidden">{status}</span>
    </Link>
  );
}
