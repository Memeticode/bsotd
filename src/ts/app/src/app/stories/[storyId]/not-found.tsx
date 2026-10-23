import Link from "next/link";

import { SiteHeader } from "@/components/site/SiteHeader";
import styles from "./page.module.css";

export default function StoryNotFound() {
  return (
    <>
      <SiteHeader section="stories" />
      <main className={styles.main}>
        <h1 className={styles.title}>Story not found</h1>
        <p>
          It may have joined another story when its day was clustered again.
          The <Link href="/">latest stories</Link> are a good place to look.
        </p>
      </main>
    </>
  );
}
