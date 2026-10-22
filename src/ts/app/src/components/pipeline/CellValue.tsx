import { ColumnType } from "@bsotd/pipeline/core";

import { formatValue } from "@/lib/format-value";
import styles from "./CellValue.module.css";

/** A table cell's value, formatted for its column type. */
export function CellValue({ value, type }: { value: unknown; type?: ColumnType }) {
  if (value === null || value === undefined) {
    return <span className={styles.null}>null</span>;
  }

  const text = formatValue(value, type);

  if (type === ColumnType.Url && /^https?:\/\//.test(text)) {
    return (
      <a href={text} target="_blank" rel="noreferrer" className={styles.value}>
        {text}
      </a>
    );
  }

  return <span className={styles.value}>{text}</span>;
}
