import { DatasetKind, type Dataset } from "./models/index.ts";

/** Whether editors write the dataset through the app, rather than a job. */
export function isEditorial(dataset: Dataset): boolean {
  return (
    (dataset.kind === DatasetKind.Table || dataset.kind === DatasetKind.View) &&
    dataset.editorial === true
  );
}
