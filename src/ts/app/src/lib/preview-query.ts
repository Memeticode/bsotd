import { SortDirection, type RelationDataset } from "@bsotd/pipeline/core";

// Identifiers come from the pipeline definition, never from a request. They
// are quoted anyway so unusual names can't break the SQL.

const SQL_DIRECTIONS: Record<SortDirection, string> = {
  [SortDirection.Ascending]: "ASC",
  [SortDirection.Descending]: "DESC",
};

/** A relation's columns, in order. Parameters: $1 schema, $2 table or view. */
export const COLUMNS_QUERY = `SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = $1 AND table_name = $2
ORDER BY ordinal_position`;

/** e.g. news.gnews_article -> { schema: "news", relation: "gnews_article" } */
export function splitRelation(name: string): { schema: string; relation: string } {
  const [schema, relation] = name.includes(".")
    ? name.split(".", 2)
    : ["public", name];

  return { schema, relation };
}

/** e.g. news -> "news" */
export function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

/** e.g. news.gnews_article -> "news"."gnews_article" */
export function quoteRelation(name: string): string {
  return name.split(".").map(quoteIdentifier).join(".");
}

/**
 * Selects one page of a dataset, ordered by its sortBy or else by its first
 * column, descending. Parameters: $1 is the page size and $2 the number of
 * rows to skip.
 */
export function previewQuery(dataset: RelationDataset): string {
  const orderBy = dataset.sortBy?.length
    ? dataset.sortBy
        .map((key) => `${quoteIdentifier(key.column)} ${SQL_DIRECTIONS[key.direction]}`)
        .join(", ")
    : "1 DESC";

  return `SELECT * FROM ${quoteRelation(dataset.name)} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`;
}

export function countQuery(dataset: RelationDataset): string {
  return `SELECT count(*)::int AS total FROM ${quoteRelation(dataset.name)}`;
}
