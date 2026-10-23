import Link from "next/link";

import styles from "./SiteHeader.module.css";

const SECTIONS = [
  { id: "stories", href: "/", label: "Stories" },
  { id: "pipeline", href: "/pipeline", label: "Pipeline" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

/** The bar at the top of every page, marking the section it's in. */
export function SiteHeader({ section }: { section: Section }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        BSOTD
      </Link>
      <nav aria-label="Sections">
        <ul className={styles.sections}>
          {SECTIONS.map(({ id, href, label }) => (
            <li key={id}>
              <Link
                href={href}
                className={styles.section}
                aria-current={id === section ? "true" : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
