/** A connection between steps: `to` reads datasets that `from` outputs. */
export interface StepEdge {
  /** ID of the step that outputs the datasets. */
  from: string;
  /** ID of the step that reads them. */
  to: string;
  /** Names of the datasets passed along this edge. */
  datasets: string[];
}
