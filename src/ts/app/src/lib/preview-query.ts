import { SortDirection, type RelationDataset } from "@bsotd/pipeline/core";

// Identifiers come from the pipeline definition, never from a request. They
// are quoted anyway so unusual names can't break the SQL.

const SQL_DIRECTIONS: Record<SortDirection, string> = {
  [SortDirection.Ascending]: "ASC",
  [SortDirection.Descending]: "DESC",
};

/** e.g. news -> "news" */
export function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

/** e.g. news.gnews_article -> "news"."gnews_article" */
export function quoteRelation(name: string): string {
  return name.split(".").map(quoteIdentifier).join(".");
}

/**
 * Selects a dataset's declared columns in its declared order. The row limit
 * is the query's only parameter, $1.
 */
export function previewQuery(dataset: RelationDataset): string {
  const columns = dataset.columns
    .map((column) => quoteIdentifier(column.name))
    .join(", ");

  const orderBy = dataset.sortBy
    .map((key) => `${quoteIdentifier(key.column)} ${SQL_DIRECTIONS[key.direction]}`)
    .join(", ");

  return [
    `SELECT ${columns}`,
    `FROM ${quoteRelation(dataset.name)}`,
    ...(orderBy ? [`ORDER BY ${orderBy}`] : []),
    "LIMIT $1",
  ].join(" ");
}

export function countQuery(dataset: RelationDataset): string {
  return `SELECT count(*)::int AS total FROM ${quoteRelation(dataset.name)}`;
}
