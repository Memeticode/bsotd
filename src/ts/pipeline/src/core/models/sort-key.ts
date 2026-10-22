export const SortDirection = {
  Ascending: "asc",
  Descending: "desc",
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

export interface SortKey {
  column: string;
  direction: SortDirection;
}
