import { ColumnType } from "@bsotd/pipeline/core";

const JSON_PREVIEW_LENGTH = 240;
const VECTOR_PREVIEW_LENGTH = 3;

/** Formats a value read from PostgreSQL for display, based on its column type. */
export function formatValue(
  value: unknown,
  type: ColumnType = ColumnType.Text,
): string {
  if (value === null || value === undefined) {
    return "null";
  }

  switch (type) {
    case ColumnType.Timestamp:
      return value instanceof Date ? formatTimestamp(value) : String(value);
    case ColumnType.Number:
      return typeof value === "number" ? formatNumber(value) : String(value);
    case ColumnType.List:
      return Array.isArray(value) ? value.join(", ") : String(value);
    case ColumnType.Json:
      return truncate(JSON.stringify(value), JSON_PREVIEW_LENGTH);
    case ColumnType.Vector:
      return formatVector(String(value));
    case ColumnType.SparseVector:
      return formatSparseVector(String(value));
    case ColumnType.Text:
    case ColumnType.Date:
    case ColumnType.Url:
      return String(value);
  }
}

/** e.g. 2026-10-21 09:55 UTC */
function formatTimestamp(value: Date): string {
  return `${value.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

/** pgvector text such as "[0.1,0.2,...]" becomes "384 dims [0.100, 0.200, …]". */
function formatVector(text: string): string {
  const values = text.slice(1, -1).split(",");
  const preview = values
    .slice(0, VECTOR_PREVIEW_LENGTH)
    .map((v) => Number(v).toFixed(3));

  return `${values.length} dims [${preview.join(", ")}, …]`;
}

/** pgvector sparsevec text such as "{1:0.5,3:0.2}/1000" becomes "2 of 1000 non-zero". */
function formatSparseVector(text: string): string {
  const match = /^\{(.*)\}\/(\d+)$/.exec(text);

  if (match === null) {
    return text;
  }

  const [, entries, dimensions] = match;
  const nonZero = entries === "" ? 0 : entries.split(",").length;

  return `${nonZero} of ${dimensions} non-zero`;
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
