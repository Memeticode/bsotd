import Link from "next/link";
import { Fragment } from "react";
import type { PipelineStep } from "@bsotd/pipeline/core";

/** Steps as a comma-separated list of links. */
export function StepLinks({ steps }: { steps: PipelineStep[] }) {
  return steps.map((step, index) => (
    <Fragment key={step.id}>
      {index > 0 && ", "}
      <Link href={`/pipeline/${step.id}`}>{step.name}</Link>
    </Fragment>
  ));
}
