import type { RelationDataset } from "@bsotd/pipeline/core";

import { fetchDatasetPreview } from "@/lib/dataset-preview";
import { CellValue } from "./CellValue";
import styles from "./DatasetPreview.module.css";

/** The first rows of a table or view, read live from PostgreSQL. */
export async function DatasetPreview({ dataset }: { dataset: RelationDataset }) {
  const preview = await fetchDatasetPreview(dataset);

  if (preview.outcome === "missing") {
    return <p className={styles.note}>Not created in the database yet.</p>;
  }

  if (preview.outcome === "error") {
    return <p className={styles.error}>Couldn't load rows: {preview.message}</p>;
  }

  if (preview.totalRows === 0) {
    return <p className={styles.note}>No rows yet.</p>;
  }

  const shown = preview.rows.length;
  const total = preview.totalRows;

  return (
    <>
      <p className={styles.count}>
        {shown === total
          ? rowCount(total)
          : `First ${shown} of ${rowCount(total)}`}
      </p>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {dataset.columns.map((column) => (
                <th key={column.name} scope="col">
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, index) => (
              <tr key={index}>
                {dataset.columns.map((column) => (
                  <td key={column.name}>
                    <CellValue value={row[column.name]} type={column.type} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function rowCount(count: number): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "row" : "rows"}`;
}
