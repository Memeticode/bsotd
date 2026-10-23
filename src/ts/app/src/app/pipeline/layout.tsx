import type { ReactNode } from "react";
import { jobsPipeline } from "@bsotd/pipeline";

import { PipelineDag } from "@/components/pipeline/PipelineDag";
import { SiteHeader } from "@/components/site/SiteHeader";
import styles from "./layout.module.css";

export default function PipelineLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <SiteHeader section="pipeline" />
      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Pipeline jobs">
          <PipelineDag pipeline={jobsPipeline} />
        </nav>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
