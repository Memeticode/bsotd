import { connection } from "next/server";
import type { RelationDataset } from "@bsotd/pipeline/core";

import { getPool } from "./db";
import { countQuery, previewQuery } from "./preview-query";

export const PREVIEW_ROW_LIMIT = 50;

export type DatasetPreview =
  | { outcome: "rows"; rows: Record<string, unknown>[]; totalRows: number }
  | { outcome: "missing" }
  | { outcome: "error"; message: string };

// PostgreSQL's error code for a relation that doesn't exist.
const UNDEFINED_TABLE = "42P01";

/** The first rows of a dataset, read live from PostgreSQL. */
export async function fetchDatasetPreview(
  dataset: RelationDataset,
): Promise<DatasetPreview> {
  // Read at request time, never while prerendering.
  await connection();

  try {
    const pool = getPool();
    const [preview, count] = await Promise.all([
      pool.query(previewQuery(dataset), [PREVIEW_ROW_LIMIT]),
      pool.query<{ total: number }>(countQuery(dataset)),
    ]);

    return {
      outcome: "rows",
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
