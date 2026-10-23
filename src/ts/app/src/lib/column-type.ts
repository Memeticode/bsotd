/** How a column's values are shown. */
export const ColumnType = {
  Text: "text",
  Number: "number",
  Date: "date",
  Timestamp: "timestamp",
  List: "list",
  Json: "json",
  Vector: "vector",
  SparseVector: "sparse-vector",
} as const;

export type ColumnType = (typeof ColumnType)[keyof typeof ColumnType];

/**
 * Picks how to show a column from its type in information_schema.columns:
 * data_type, plus udt_name for extension types such as pgvector's.
 */
export function columnType(dataType: string, udtName: string): ColumnType {
  switch (dataType) {
    case "smallint":
    case "integer":
    case "bigint":
    case "numeric":
    case "real":
    case "double precision":
      return ColumnType.Number;
    case "date":
      return ColumnType.Date;
    case "timestamp with time zone":
    case "timestamp without time zone":
      return ColumnType.Timestamp;
    case "json":
    case "jsonb":
      return ColumnType.Json;
    case "ARRAY":
      return ColumnType.List;
    case "USER-DEFINED":
      return udtName === "vector"
        ? ColumnType.Vector
        : udtName === "sparsevec"
          ? ColumnType.SparseVector
          : ColumnType.Text;
    default:
      return ColumnType.Text;
  }
}
