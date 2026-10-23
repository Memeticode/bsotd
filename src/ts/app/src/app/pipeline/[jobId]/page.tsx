import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { jobsPipeline } from "@bsotd/pipeline";
import {
  datasetProducer,
  downstreamJobs,
  findJob,
  jobKind,
  jobStatus,
} from "@bsotd/pipeline/core";

import { DatasetSection } from "@/components/pipeline/DatasetSection";
import { JobStepChain } from "@/components/pipeline/JobStepChain";
import { JOB_STEP_KIND_LABELS } from "@/components/pipeline/labels";
import { StatusBadge } from "@/components/pipeline/StatusBadge";
import { Tag } from "@/components/ui/Tag";
import type { Paging, SearchParams } from "@/lib/pagination";
import styles from "./page.module.css";

interface JobPageProps {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
}: JobPageProps): Promise<Metadata> {
  const job = findJob(jobsPipeline, (await params).jobId);

  return { title: job?.name ?? "Job not found" };
}

export default async function JobPage({ params, searchParams }: JobPageProps) {
  const job = findJob(jobsPipeline, (await params).jobId);

  if (job === undefined) {
    notFound();
  }

  const paging: Paging = {
    path: `/pipeline/${job.id}`,
    params: await searchParams,
  };

  return (
    <article className={styles.job}>
      <header>
        <div className={styles.tags}>
          <Tag>{JOB_STEP_KIND_LABELS[jobKind(job)]}</Tag>
          <StatusBadge status={jobStatus(job)} />
        </div>
        <h1 className={styles.title}>{job.name}</h1>
        <p className={styles.summary}>{job.summary}</p>
      </header>

      <section>
        <h2 className={styles.heading}>Inputs</h2>
        {job.inputs.map((input) => (
          <DatasetSection
            key={input.name}
            dataset={input}
            paging={paging}
            source={datasetProducer(jobsPipeline, input.name)}
          />
        ))}
      </section>

      <section>
        <h2 className={styles.heading}>Steps</h2>
        <JobStepChain
          job={job}
          readBy={downstreamJobs(jobsPipeline, job.id)}
          paging={paging}
        />
      </section>

      {job.notes && (
        <section>
          <h2 className={styles.heading}>Notes</h2>
          <ul className={styles.notes}>
            {job.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
