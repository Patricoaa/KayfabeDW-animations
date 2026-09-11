import {describe, expect, it, vi} from 'vitest';
import {paginateRows, PAGE_SIZE, ABS_MAX_ROWS} from '@/lib/paginate';

function shortPage(rows: Record<string, unknown>[]) {
  return {rows, ok: true};
}

describe('paginateRows', () => {
  it('returns empty for a single empty page', async () => {
    const fetchPage = vi.fn(async () => shortPage([]));
    const r = await paginateRows(fetchPage, ABS_MAX_ROWS, PAGE_SIZE);
    expect(r.truncated).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(r.rows).toHaveLength(0);
  });

  it('stops at the natural end of data on a short page', async () => {
    const fetchPage = vi.fn(async (pageSize: number, offset: number) => {
      return shortPage(offset === 0 ? [{i: 0}, {i: 1}] : []);
    });
    const r = await paginateRows(fetchPage, ABS_MAX_ROWS, PAGE_SIZE);
    expect(r.truncated).toBe(false);
    expect(r.rows).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('walks full pages until the cap for an exact fit, without an extra call', async () => {
    const rows = Array.from({length: ABS_MAX_ROWS}, (_, i) => ({i}));
    const calls: {offset: number; pageSize: number}[] = [];
    const fetchPage = vi.fn(async (pageSize: number, offset: number) => {
      calls.push({offset, pageSize});
      return shortPage(rows.slice(offset, offset + pageSize));
    });
    const r = await paginateRows(fetchPage, ABS_MAX_ROWS, PAGE_SIZE);
    expect(r.truncated).toBe(true);
    expect(r.rows).toHaveLength(ABS_MAX_ROWS);
    expect(calls).toHaveLength(Math.ceil(ABS_MAX_ROWS / PAGE_SIZE));
    expect(calls[0].offset).toBe(0);
    expect(calls[0].pageSize).toBe(PAGE_SIZE);
    expect(calls[1].offset).toBe(PAGE_SIZE);
  });

  it('shrinks the final page to the cap so it never over-fetches', async () => {
    const rows = Array.from({length: 5}, (_, i) => ({i}));
    const calls: number[] = [];
    const fetchPage = vi.fn(async (pageSize: number, offset: number) => {
      calls.push(pageSize);
      return shortPage(rows.slice(offset, offset + pageSize));
    });
    const r = await paginateRows(fetchPage, 5, PAGE_SIZE);
    expect(r.truncated).toBe(true);
    expect(r.rows).toHaveLength(5);
    expect(calls).toEqual([5]);
  });

  it('throws when a page fails', async () => {
    const fetchPage = vi.fn(async () => ({rows: [], ok: false, error: 'boom'}));
    await expect(paginateRows(fetchPage, ABS_MAX_ROWS, PAGE_SIZE)).rejects.toThrow('boom');
  });
});