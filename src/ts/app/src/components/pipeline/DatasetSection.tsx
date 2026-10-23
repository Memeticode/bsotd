import Link from "next/link";
import { Suspense } from "react";
import {
  DatasetKind,
  isEditorial,
  type Dataset,
  type PipelineJob,
} from "@bsotd/pipeline/core";

import { Tag } from "@/components/ui/Tag";
import type { Paging } from "@/lib/pagination";
import { DatasetPreview } from "./DatasetPreview";
import { JobLinks } from "./JobLinks";
import { DATASET_KIND_LABELS } from "./labels";
import styles from "./DatasetSection.module.css";

interface DatasetSectionProps {
  dataset: Dataset;
  paging: Paging;
  /** The job whose output this is, when shown as an input. */
  source?: PipelineJob;
  /** Set when this is a job's output: the jobs that read it. */
  readBy?: PipelineJob[];
}

/** A dataset: what it is, and its data where there is any to show. */
export function DatasetSection({
  dataset,
  paging,
  source,
  readBy,
}: DatasetSectionProps) {
  const isRelation =
    dataset.kind === DatasetKind.Table || dataset.kind === DatasetKind.View;

  return (
    <section className={styles.dataset}>
      <header className={styles.header}>
        <h3 className={isRelation ? styles.relation : styles.title}>
          {dataset.name}
        </h3>
        <Tag>{DATASET_KIND_LABELS[dataset.kind]}</Tag>
        {readBy && <Tag tone="accent">Output</Tag>}
        {isEditorial(dataset) && (
          <>
            <Tag>Editorial</Tag>
            <span className={styles.muted}>written by editors on story pages</span>
          </>
        )}
        {source && (
          <span className={styles.muted}>
            from <Link href={`/pipeline/${source.id}`}>{source.name}</Link>
          </span>
        )}
      </header>
      <p className={styles.description}>{dataset.description}</p>
      {readBy && readBy.length > 0 && (
        <p className={styles.readBy}>
          Read by <JobLinks jobs={readBy} />.
        </p>
      )}
      <DatasetBody dataset={dataset} paging={paging} />
    </section>
  );
}

function DatasetBody({ dataset, paging }: { dataset: Dataset; paging: Paging }) {
  switch (dataset.kind) {
    case DatasetKind.Table:
    case DatasetKind.View:
      return (
        <Suspense fallback={<p className={styles.muted}>Loading rows…</p>}>
          <DatasetPreview dataset={dataset} paging={paging} />
        </Suspense>
      );
    case DatasetKind.Planned:
      return <ExpectedFields fields={dataset.expectedFields} />;
    case DatasetKind.External:
      return (
        <a href={dataset.url} target="_blank" rel="noreferrer">
          {dataset.url}
        </a>
      );
  }
}

function ExpectedFields({ fields }: { fields: string[] }) {
  if (fields.length === 0) {
    return <p className={styles.muted}>Schema to be designed.</p>;
  }

  return (
    <>
      <p className={styles.muted}>Schema to be designed. Expected fields:</p>
      <ul className={styles.fields}>
        {fields.map((field) => (
          <li key={field}>
            <code>{field}</code>
          </li>
        ))}
      </ul>
    </>
  );
}
