import { Suspense } from "react";
import { DatasetKind, type OutputDataset } from "@bsotd/pipeline/core";

import { Tag } from "@/components/ui/Tag";
import { DatasetPreview } from "./DatasetPreview";
import { DATASET_KIND_LABELS } from "./labels";
import styles from "./DatasetSection.module.css";

/** One output dataset: what it is, and a preview of its rows where it exists. */
export function DatasetSection({ dataset }: { dataset: OutputDataset }) {
  const isPlanned = dataset.kind === DatasetKind.Planned;

  return (
    <section className={styles.dataset}>
      <header className={styles.header}>
        <h3 className={isPlanned ? styles.title : styles.relation}>
          {dataset.name}
        </h3>
        <Tag>{DATASET_KIND_LABELS[dataset.kind]}</Tag>
      </header>
      <p className={styles.description}>{dataset.description}</p>
      {isPlanned ? (
        <ExpectedFields fields={dataset.expectedFields} />
      ) : (
        <Suspense fallback={<p className={styles.note}>Loading rows…</p>}>
          <DatasetPreview dataset={dataset} />
        </Suspense>
      )}
    </section>
  );
}

function ExpectedFields({ fields }: { fields: string[] }) {
  if (fields.length === 0) {
    return <p className={styles.note}>Schema to be designed.</p>;
  }

  return (
    <>
      <p className={styles.note}>Schema to be designed. Expected fields:</p>
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
