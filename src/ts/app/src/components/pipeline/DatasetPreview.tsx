import Link from "next/link";
import type { RelationDataset } from "@bsotd/pipeline/core";

import { Collapsible } from "@/components/ui/Collapsible";
import { fetchDatasetPreview } from "@/lib/dataset-preview";
import { PAGE_SIZE, pageHref, pageNumber, type Paging } from "@/lib/pagination";
import { CellValue } from "./CellValue";
import { Pager } from "./Pager";
import styles from "./DatasetPreview.module.css";

interface DatasetPreviewProps {
  dataset: RelationDataset;
  paging: Paging;
}

/**
 * One page of a table or view, read live from PostgreSQL. The table starts
 * collapsed unless a link already moved it past its first page.
 */
export async function DatasetPreview({ dataset, paging }: DatasetPreviewProps) {
  const page = pageNumber(paging.params, dataset.name);
  const hrefFor = (target: number) => pageHref(paging, dataset.name, target);
  const preview = await fetchDatasetPreview(dataset, page);

  if (preview.outcome === "missing") {
    return <p className={styles.note}>Not created in the database yet.</p>;
  }

  if (preview.outcome === "error") {
    return <p className={styles.error}>Couldn't load rows: {preview.message}</p>;
  }

  if (preview.totalRows === 0) {
    return <p className={styles.note}>No rows yet.</p>;
  }

  if (preview.rows.length === 0) {
    return (
      <p className={styles.note}>
        Page {page} is past the last row.{" "}
        <Link href={hrefFor(1)} scroll={false}>
          Back to the first page
        </Link>
      </p>
    );
  }

  return (
    <Collapsible summary={rowCount(preview.totalRows)} defaultOpen={page > 1}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {preview.columns.map((column) => (
                <th key={column.name} scope="col">
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, index) => (
              <tr key={index}>
                {preview.columns.map((column) => (
                  <td key={column.name}>
                    <CellValue value={row[column.name]} type={column.type} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        totalRows={preview.totalRows}
        hrefFor={hrefFor}
      />
    </Collapsible>
  );
}

function rowCount(count: number): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "row" : "rows"}`;
}
