import type { Column } from "./column.ts";
import type { SortKey } from "./sort-key.ts";

export const DatasetKind = {
  Table: "table",
  View: "view",
  Planned: "planned",
  External: "external",
} as const;

export type DatasetKind = (typeof DatasetKind)[keyof typeof DatasetKind];

/** A table or view in PostgreSQL. */
export interface RelationDataset {
  kind: typeof DatasetKind.Table | typeof DatasetKind.View;
  /** Schema-qualified relation name, e.g. "news.gnews_article". */
  name: string;
  description: string;
  /** Columns worth showing, in display order. */
  columns: Column[];
  sortBy: SortKey[];
}

/** An output whose storage hasn't been designed yet. */
export interface PlannedDataset {
  kind: typeof DatasetKind.Planned;
  name: string;
  description: string;
  /** What the output is expected to hold, in words. */
  expectedFields: string[];
}

/** Data that enters the pipeline from outside, such as an API. */
export interface ExternalDataset {
  kind: typeof DatasetKind.External;
  name: string;
  description: string;
  url: string;
}

/** Datasets a step can write. */
export type OutputDataset = RelationDataset | PlannedDataset;

export type Dataset = OutputDataset | ExternalDataset;
