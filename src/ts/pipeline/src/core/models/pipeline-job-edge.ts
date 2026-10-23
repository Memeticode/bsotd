/** A connection between jobs: `to` reads datasets that `from` outputs. */
export interface PipelineJobEdge {
  /** ID of the job that outputs the datasets. */
  from: string;
  /** ID of the job that reads them. */
  to: string;
  /** Names of the datasets passed along this edge. */
  datasets: string[];
}
