import type {ChartConfig} from '@/lib/chart-config';
import type {NumberFormat, SortBy, ChartFilter} from '@/lib/chart-config';

export type SeriesItem = {
  label: string;
  value: number;
  color?: string;
  raw?: Record<string, unknown>;
};

export type PreparedData = {
  items: SeriesItem[];
  categories: string[];
  values: number[];
  max: number;
  min: number;
};

/**
 * Aggregates rows by a group column using the given aggregate function.
 * Used when multiple rows share the same category (e.g. after GROUP BY in SQL,
 * or when a non-agg query returns repeated labels).
 */
export function aggregate(
  data: Record<string, unknown>[],
  yField: string,
  agg: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct',
  groupField: string,
): Record<string, unknown>[] {
  const groups = new Map<string, number[]>();
  const distinct = new Map<string, Set<string>>();
  for (const row of data) {
    const key = String(row[groupField] ?? '');
    const val = Number(row[yField] ?? 0);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(isNaN(val) ? 0 : val);
    if (!distinct.has(key)) distinct.set(key, new Set());
    const raw = row[yField];
    distinct.get(key)!.add(raw === null || raw === undefined ? String(raw) : String(raw));
  }
  return Array.from(groups.entries()).map(([label, vals]) => {
    let value: number;
    switch (agg) {
      case 'sum':
        value = vals.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        break;
      case 'max':
        value = Math.max(...vals);
        break;
      case 'min':
        value = Math.min(...vals);
        break;
      case 'count_distinct':
        value = distinct.get(label)?.size ?? 0;
        break;
      case 'count':
      default:
        value = vals.length;
        break;
    }
    return {[groupField]: label, [yField]: value};
  });
}

export function sortRows(
  data: Record<string, unknown>[],
  sortBy: SortBy,
  yField: string,
  xField: string,
): Record<string, unknown>[] {
  const arr = [...data];
  switch (sortBy) {
    case 'value-desc':
      return arr.sort((a, b) => Number(b[yField] ?? 0) - Number(a[yField] ?? 0));
    case 'value-asc':
      return arr.sort((a, b) => Number(a[yField] ?? 0) - Number(b[yField] ?? 0));
    case 'label':
      return arr.sort((a, b) => String(a[xField] ?? '').localeCompare(String(b[xField] ?? '')));
    case 'none':
    default:
      return arr;
  }
}

export function limitRows(data: Record<string, unknown>[], limit?: number): Record<string, unknown>[] {
  if (!limit || limit <= 0) return data;
  return data.slice(0, limit);
}

/**
 * Applies post-capture row filters (chart-level, step 2) to the raw dataset.
 * These filter the already-fetched rows in the client and are NOT part of the
 * SQL query. Comparison is numeric when both sides parse as numbers, otherwise
 * string.
 */
export function applyChartFilters(
  data: Record<string, unknown>[],
  filters?: ChartFilter[],
): Record<string, unknown>[] {
  if (!filters || filters.length === 0) return data;
  return data.filter((row) => {
    for (const f of filters) {
      const raw = row[f.column];
      if (!passesFilter(raw, f)) return false;
    }
    return true;
  });
}

function passesFilter(raw: unknown, f: ChartFilter): boolean {
  const val = String(raw ?? '');
  switch (f.op) {
    case 'is_empty':
      return raw === null || raw === undefined || String(raw).trim() === '';
    case 'is_not_empty':
      return raw !== null && raw !== undefined && String(raw).trim() !== '';
    case 'contains':
      return val.toLowerCase().includes((f.value ?? '').toLowerCase());
    default: {
      const a = Number(raw);
      const b = Number(f.value);
      if (raw !== null && raw !== undefined && raw !== '' && f.value !== '' && !isNaN(a) && !isNaN(b)) {
        switch (f.op) {
          case 'eq': return a === b;
          case 'neq': return a !== b;
          case 'gt': return a > b;
          case 'gte': return a >= b;
          case 'lt': return a < b;
          case 'lte': return a <= b;
        }
      }
      switch (f.op) {
        case 'eq': return val === String(f.value ?? '');
        case 'neq': return val !== String(f.value ?? '');
        case 'gt': return val > String(f.value ?? '');
        case 'gte': return val >= String(f.value ?? '');
        case 'lt': return val < String(f.value ?? '');
        case 'lte': return val <= String(f.value ?? '');
      }
      return true;
    }
  }
}

export function formatValue(value: number, format: NumberFormat): string {
  if (isNaN(value)) return '0';
  switch (format) {
    case 'percent':
      return `${Math.round(value * 100)}%`;
    case 'currency':
      return value.toLocaleString('es', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
    case 'decimal':
      return value.toLocaleString('es', {maximumFractionDigits: 2});
    case 'short':
      if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
      return Math.round(value).toString();
    case 'none':
    default:
      return String(value);
  }
}

export function pickColor(colors: string[] | undefined, index: number): string {
  const palette = colors && colors.length ? colors : ['#6366f1'];
  return palette[index % palette.length];
}

/**
 * Prepares a series from raw rows for a single-series chart.
 * - Picks x/y fields (falling back to auto-detection)
 * - Optionally aggregates by group, sorts, limits, and applies colors
 */
export function prepareSeries(
  data: Record<string, unknown>[],
  config: ChartConfig,
): PreparedData {
  const rows = data ?? [];
  if (rows.length === 0) {
    return {items: [], categories: [], values: [], max: 0, min: 0};
  }

  let xField = config.xField;
  let yField = config.yField;
  if (!xField || !rows[0] || !(xField in rows[0])) {
    xField = pickAutoField(rows[0], 'category');
  }
  if (!yField || !rows[0] || !(yField in rows[0])) {
    yField = pickAutoField(rows[0], 'value');
  }
  if (!xField) xField = Object.keys(rows[0])[0] ?? '';
  if (!yField) yField = Object.keys(rows[0])[1] ?? xField;

  let working = rows;
  if (config.aggregate) {
    working = aggregate(rows, yField, config.aggregate, xField);
  }
  working = sortRows(working, config.sortBy ?? 'none', yField, xField);
  working = limitRows(working, config.limit);

  const items: SeriesItem[] = working.map((row, i) => ({
    label: String(row[xField] ?? ''),
    value: Number(row[yField] ?? 0),
    color: row[config.colorField ?? ''] !== undefined
      ? String(row[config.colorField!])
      : pickColor(config.colors, i),
    raw: row,
  })).filter((d) => !isNaN(d.value));

  const values = items.map((i) => i.value);
  return {
    items,
    categories: items.map((i) => i.label),
    values,
    max: values.length ? Math.max(...values, 0) : 0,
    min: values.length ? Math.min(...values, 0) : 0,
  };
}

/**
 * Canonical minimal series shape shared by the static chart renderers and the
 * animated (Remotion) templates. Both consumers build it from the same
 * `prepareSeries` path so shapes/colors/sort/limit always agree.
 */
export type CanonicalSeries = {
  label: string;
  value: number;
  color: string;
};

export function toSeries(prepared: PreparedData): CanonicalSeries[] {
  return prepared.items.map((item) => ({
    label: item.label,
    value: item.value,
    color: item.color ?? pickColor(undefined, 0),
  }));
}

export function detectAggregateField(data: Record<string, unknown>[], yField: string, xField: string): 'sum' | 'avg' | 'count' | null {
  if (data.length < 2) return null;
  const groups = new Set(data.map((r) => String(r[xField] ?? '')));
  if (groups.size < data.length) {
    return 'sum';
  }
  return null;
}

function pickAutoField(row: Record<string, unknown>, kind: 'category' | 'value'): string {
  const keys = Object.keys(row);
  if (kind === 'value') {
    return keys.find((k) => typeof row[k] === 'number' && !isNaN(Number(row[k]))) ?? '';
  }
  return keys.find((k) => typeof row[k] !== 'number' || isNaN(Number(row[k]))) ?? keys[0] ?? '';
}
