/** What an editor's form shows after submitting. */
export interface ActionState {
  status: "idle" | "saved" | "error";
  message?: string;
}

export const IDLE: ActionState = { status: "idle" };
