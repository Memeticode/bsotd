import Link from "next/link";
import type { ReactNode } from "react";
import { newsPipeline } from "@bsotd/pipeline";

import { PipelineDag } from "@/components/pipeline/PipelineDag";
import styles from "./layout.module.css";

export default function PipelineLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.home}>
          BSOTD
        </Link>
        <span className={styles.separator} aria-hidden="true">
          /
        </span>
        <Link href="/pipeline" className={styles.section}>
          Pipeline
        </Link>
      </header>
      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Pipeline steps">
          <PipelineDag pipeline={newsPipeline} />
        </nav>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
