export const PAGE_SIZE = 5000;
export const ABS_MAX_ROWS = 50000;

export type PageResult = {
  rows: Record<string, unknown>[];
  ok: boolean;
  error?: string;
};

export type FetchPage = (pageSize: number, offset: number) => Promise<PageResult>;

export type PaginateResult = {
  rows: Record<string, unknown>[];
  truncated: boolean;
};

/**
 * Captures the full result set of a query by walking OFFSET pages, up to a
 * per-query safety ceiling to avoid memory blowups on the serverless function.
 *
 * Pure: the page-fetching strategy is injected as `fetchPage`, so the loop can
 * be unit-tested without an HTTP layer.
 *
 * Loop rules:
 * - Stops early on a "short" page (`rows.length < pageSize`): the natural end
 *   of the data.
 * - Otherwise keeps walking until it reaches `cap` or the source is exhausted.
 * - `pageSize` shrinks as `cap` approaches so the final page never over-fetches;
 *   an exact fit (all.length === cap) exits cleanly without an extra call.
 *
 * @param fetchPage  fetches one page given a page size and OFFSET.
 * @param cap        absolute ceiling on rows to capture (safety / user limit).
 * @param pageSize   nominal page size requested by the caller.
 */
export async function paginateRows(
  fetchPage: FetchPage,
  cap: number,
  pageSize: number = PAGE_SIZE,
): Promise<PaginateResult> {
  const effectivePageSize = Math.max(1, Math.min(pageSize, cap));
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  let truncated = false;

  while (all.length < cap) {
    const remaining = cap - all.length;
    const size = Math.min(effectivePageSize, remaining);
    const {rows, ok, error} = await fetchPage(size, offset);
    if (!ok) throw new Error(error ?? 'Error executing query');
    all.push(...rows);

    // Natural end of data: a short page means there are no more rows.
    if (rows.length < size) {
      truncated = all.length >= cap;
      return {rows: all, truncated};
    }
    offset += size;
  }

  truncated = true;
  return {rows: all, truncated};
}
