import Link from "next/link";

import { SiteHeader } from "@/components/site/SiteHeader";
import styles from "./page.module.css";

export default function EditorStoryNotFound() {
  return (
    <>
      <SiteHeader section="editor" />
      <main className={styles.main}>
        <h1 className={styles.title}>Story not found</h1>
        <p>
          It may have joined another story when its day was clustered again.
          The <Link href="/editor">editor's day view</Link> lists every story.
        </p>
      </main>
    </>
  );
}
