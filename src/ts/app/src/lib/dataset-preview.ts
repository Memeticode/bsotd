import { connection } from "next/server";
import type { RelationDataset } from "@bsotd/pipeline/core";

import { columnType, type ColumnType } from "./column-type";
import { getPool } from "./db";
import { PAGE_SIZE } from "./pagination";
import {
  COLUMNS_QUERY,
  countQuery,
  previewQuery,
  splitRelation,
} from "./preview-query";

export interface PreviewColumn {
  name: string;
  type: ColumnType;
}

export type DatasetPreview =
  | {
      outcome: "rows";
      columns: PreviewColumn[];
      rows: Record<string, unknown>[];
      totalRows: number;
    }
  | { outcome: "missing" }
  | { outcome: "error"; message: string };

// PostgreSQL's error code for a relation that doesn't exist.
const UNDEFINED_TABLE = "42P01";

/** One page of a dataset's rows, with its columns, read live from PostgreSQL. */
export async function fetchDatasetPreview(
  dataset: RelationDataset,
  page: number,
): Promise<DatasetPreview> {
  // Read at request time, never while prerendering.
  await connection();

  const { schema, relation } = splitRelation(dataset.name);

  try {
    const pool = getPool();
    const [columns, preview, count] = await Promise.all([
      pool.query<{ column_name: string; data_type: string; udt_name: string }>(
        COLUMNS_QUERY,
        [schema, relation],
      ),
      pool.query(previewQuery(dataset), [PAGE_SIZE, (page - 1) * PAGE_SIZE]),
      pool.query<{ total: number }>(countQuery(dataset)),
    ]);

    return {
      outcome: "rows",
      columns: columns.rows.map((column) => ({
        name: column.column_name,
        type: columnType(column.data_type, column.udt_name),
      })),
      rows: preview.rows,
      totalRows: count.rows[0]?.total ?? 0,
    };
  } catch (error) {
    if (isPostgresError(error, UNDEFINED_TABLE)) {
      return { outcome: "missing" };
    }

    const message = error instanceof Error ? error.message : String(error);
    return { outcome: "error", message };
  }
}

function isPostgresError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
