"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import type { Status, StepKind } from "@bsotd/pipeline/core";

import { Dag } from "@/components/dag/Dag";
import type { DagLayout } from "@/components/dag/dag-layout";
import { STATUS_LABELS, STEP_KIND_LABELS } from "./labels";
import styles from "./PipelineDagClient.module.css";

export interface DagStep {
  id: string;
  name: string;
  kind: StepKind;
  status: Status;
}

interface PipelineDagClientProps {
  steps: DagStep[];
  layout: DagLayout;
}

/** Draws each step as a link and highlights the step being viewed. */
export function PipelineDagClient({ steps, layout }: PipelineDagClientProps) {
  const activeId = useSelectedLayoutSegment();
  const stepsById = new Map(steps.map((step) => [step.id, step]));

  return (
    <Dag
      layout={layout}
      activeId={activeId}
      renderNode={(id) => {
        const step = stepsById.get(id);
        return step && <StepNode step={step} active={id === activeId} />;
      }}
    />
  );
}

function StepNode({ step, active }: { step: DagStep; active: boolean }) {
  const status = STATUS_LABELS[step.status];

  return (
    <Link
      href={`/pipeline/${step.id}`}
      className={styles.node}
      data-status={step.status}
      aria-current={active ? "page" : undefined}
      title={`${step.name} (${status})`}
    >
      <span className={styles.meta}>
        {STEP_KIND_LABELS[step.kind]}
        <span className={styles.dot} aria-hidden="true" />
      </span>
      <span className={styles.name}>{step.name}</span>
      <span className="visually-hidden">{status}</span>
    </Link>
  );
}
