/** How a column's values should be read. Drives formatting, not storage. */
export const ColumnType = {
  Text: "text",
  Number: "number",
  Date: "date",
  Timestamp: "timestamp",
  Url: "url",
  List: "list",
  Json: "json",
  Vector: "vector",
  SparseVector: "sparse-vector",
} as const;

export type ColumnType = (typeof ColumnType)[keyof typeof ColumnType];

export interface Column {
  name: string;
  /** Defaults to text. */
  type?: ColumnType;
}
