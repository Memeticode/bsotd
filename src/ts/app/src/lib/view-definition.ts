import { connection } from "next/server";

import { getPool } from "./db";
import { splitRelation } from "./preview-query";

export type ViewDefinition =
  | { outcome: "sql"; sql: string }
  | { outcome: "missing" }
  /** PostgreSQL only shows a view's SQL to roles that own it. */
  | { outcome: "hidden" }
  | { outcome: "error"; message: string };

/** A view's SQL as PostgreSQL stores it, read from the information schema. */
export async function fetchViewDefinition(name: string): Promise<ViewDefinition> {
  // Read at request time, never while prerendering.
  await connection();

  const { schema, relation } = splitRelation(name);

  try {
    const result = await getPool().query<{ view_definition: string | null }>(
      `SELECT view_definition
       FROM information_schema.views
       WHERE table_schema = $1 AND table_name = $2`,
      [schema, relation],
    );

    const row = result.rows[0];

    if (row === undefined) {
      return { outcome: "missing" };
    }

    return row.view_definition === null
      ? { outcome: "hidden" }
      : { outcome: "sql", sql: row.view_definition.trim() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { outcome: "error", message };
  }
}
