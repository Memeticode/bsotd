/**
 * How far along a transformation is. A step's status is derived from its
 * transformations.
 */
export const Status = {
  Implemented: "implemented",
  InProgress: "in-progress",
  Todo: "todo",
} as const;

export type Status = (typeof Status)[keyof typeof Status];
