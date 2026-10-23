export const PAGE_SIZE = 10;

export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Where a page's tables live. Each table's page number is kept in the query
 * string under its dataset's name, so tables page independently.
 */
export interface Paging {
  path: string;
  params: SearchParams;
}

/** The 1-based page a table is on. */
export function pageNumber(params: SearchParams, key: string): number {
  const value = params[key];
  const page = Number(Array.isArray(value) ? value[0] : value);

  return Number.isInteger(page) && page > 1 ? page : 1;
}

/** A link to the same page with one table on another page, the rest unchanged. */
export function pageHref({ path, params }: Paging, key: string, page: number): string {
  const query = new URLSearchParams();

  for (const [name, value] of Object.entries(params)) {
    if (name === key || value === undefined) {
      continue;
    }

    for (const item of Array.isArray(value) ? value : [value]) {
      query.append(name, item);
    }
  }

  if (page > 1) {
    query.set(key, String(page));
  }

  const search = query.toString();
  return search ? `${path}?${search}` : path;
}
