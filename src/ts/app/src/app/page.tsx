import Link from "next/link";

import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>BSOTD Homepage</h1>
      <p className={styles.tagline}>Coming soon.</p>
      <Link href="/pipeline" className={styles.button}>
        Pipeline
      </Link>
    </main>
  );
}
