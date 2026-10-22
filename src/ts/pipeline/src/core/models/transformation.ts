import type { Status } from "./status.ts";

export interface Transformation {
  name: string;
  description: string;
  status: Status;
  /** Repository paths of the code or SQL that implements it. */
  implementedIn?: string[];
}
