import type { SortKey } from "./sort-key.ts";

export const DatasetKind = {
  External: "external",
  Planned: "planned",
  Table: "table",
  View: "view",
} as const;

export type DatasetKind = (typeof DatasetKind)[keyof typeof DatasetKind];

/** Data that enters the pipeline from outside, such as an API. */
export interface ExternalDataset {
  kind: typeof DatasetKind.External;
  name: string;
  description: string;
  url: string;
}

/** An output whose storage hasn't been designed yet. */
export interface PlannedDataset {
  kind: typeof DatasetKind.Planned;
  name: string;
  description: string;
  /** What the output is expected to hold, in words. */
  expectedFields: string[];
}

/**
 * A table or view in PostgreSQL. Its columns and their types are read from
 * the database, not declared here.
 */
export interface RelationDataset {
  kind: typeof DatasetKind.Table | typeof DatasetKind.View;
  /** Schema-qualified relation name, e.g. "news.gnews_article". */
  name: string;
  description: string;
  /** How to order its rows when shown. Defaults to its first column, descending. */
  sortBy?: SortKey[];
  /**
   * Written by editors through the app rather than by a job, such as
   * corrections that jobs apply. Jobs read it without a job producing it.
   */
  editorial?: boolean;
}

/** Datasets a step can write. */
export type OutputDataset = RelationDataset | PlannedDataset;

export type Dataset = OutputDataset | ExternalDataset;
