import { ColumnType } from "@/lib/column-type";
import { formatValue } from "@/lib/format-value";
import styles from "./CellValue.module.css";

/** A table cell's value, formatted for its column type. Text that is a web address becomes a link. */
export function CellValue({ value, type }: { value: unknown; type: ColumnType }) {
  if (value === null || value === undefined) {
    return <span className={styles.null}>null</span>;
  }

  const text = formatValue(value, type);

  if (type === ColumnType.Text && /^https?:\/\/\S+$/.test(text)) {
    return (
      <a href={text} target="_blank" rel="noreferrer" className={styles.value}>
        {text}
      </a>
    );
  }

  return <span className={styles.value}>{text}</span>;
}
