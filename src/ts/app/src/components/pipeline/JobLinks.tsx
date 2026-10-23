import Link from "next/link";
import { Fragment } from "react";
import type { PipelineJob } from "@bsotd/pipeline/core";

/** Jobs as a comma-separated list of links. */
export function JobLinks({ jobs }: { jobs: PipelineJob[] }) {
  return jobs.map((job, index) => (
    <Fragment key={job.id}>
      {index > 0 && ", "}
      <Link href={`/pipeline/${job.id}`}>{job.name}</Link>
    </Fragment>
  ));
}
