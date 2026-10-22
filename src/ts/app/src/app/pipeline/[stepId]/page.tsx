import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { newsPipeline } from "@bsotd/pipeline";
import {
  downstreamSteps,
  findStep,
  stepStatus,
} from "@bsotd/pipeline/core";

import { DatasetSection } from "@/components/pipeline/DatasetSection";
import { InputList } from "@/components/pipeline/InputList";
import { STEP_KIND_LABELS } from "@/components/pipeline/labels";
import { StatusBadge } from "@/components/pipeline/StatusBadge";
import { StepLinks } from "@/components/pipeline/StepLinks";
import { TransformationList } from "@/components/pipeline/TransformationList";
import { Tag } from "@/components/ui/Tag";
import styles from "./page.module.css";

interface StepPageProps {
  params: Promise<{ stepId: string }>;
}

export async function generateMetadata({
  params,
}: StepPageProps): Promise<Metadata> {
  const step = findStep(newsPipeline, (await params).stepId);

  return { title: step?.name ?? "Step not found" };
}

export default async function StepPage({ params }: StepPageProps) {
  const step = findStep(newsPipeline, (await params).stepId);

  if (step === undefined) {
    notFound();
  }

  const readBy = downstreamSteps(newsPipeline, step.id);

  return (
    <article className={styles.step}>
      <header>
        <div className={styles.tags}>
          <Tag>{STEP_KIND_LABELS[step.kind]}</Tag>
          <StatusBadge status={stepStatus(step)} />
        </div>
        <h1 className={styles.title}>{step.name}</h1>
        <p className={styles.summary}>{step.summary}</p>
      </header>

      <section>
        <h2 className={styles.heading}>Inputs</h2>
        <InputList pipeline={newsPipeline} inputs={step.inputs} />
      </section>

      <section>
        <h2 className={styles.heading}>Transformations</h2>
        <TransformationList transformations={step.transformations} />
      </section>

      {step.notes && (
        <section>
          <h2 className={styles.heading}>Notes</h2>
          <ul className={styles.notes}>
            {step.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className={styles.heading}>Output data</h2>
        {step.outputs.length === 0 ? (
          <p className={styles.muted}>This step doesn't output any data.</p>
        ) : (
          step.outputs.map((dataset) => (
            <DatasetSection key={dataset.name} dataset={dataset} />
          ))
        )}
        {readBy.length > 0 && (
          <p className={styles.muted}>
            Read by <StepLinks steps={readBy} />.
          </p>
        )}
      </section>
    </article>
  );
}
