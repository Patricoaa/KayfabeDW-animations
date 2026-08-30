import type {ChartConfig} from '@/lib/chart-config';
import type {NumberFormat, SortBy, ChartFilter, ChartStyle} from '@/lib/chart-config';

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

export type ResolvedChartStyle = {
  fontFamily: string;
  titleFontSize: number;
  titleColor: string;
  labelFontSize: number;
  textColor: string;
  axisColor: string;
  gridColor: string;
  lineWidth: number;
  pointSize: number;
  pointOpacity: number;
  globalOpacity: number;
};

export const DEFAULT_CHART_STYLE: ResolvedChartStyle = {
  fontFamily: 'inherit',
  titleFontSize: 14,
  titleColor: '#aaa',
  labelFontSize: 9,
  textColor: '#888',
  axisColor: '#888',
  gridColor: '#333',
  lineWidth: 2.5,
  pointSize: 4,
  pointOpacity: 1,
  globalOpacity: 1,
};

export function resolveChartStyle(style?: ChartStyle): ResolvedChartStyle {
  return {
    fontFamily: style?.fontFamily ?? DEFAULT_CHART_STYLE.fontFamily,
    titleFontSize: style?.titleFontSize ?? DEFAULT_CHART_STYLE.titleFontSize,
    titleColor: style?.titleColor ?? DEFAULT_CHART_STYLE.titleColor,
    labelFontSize: style?.labelFontSize ?? DEFAULT_CHART_STYLE.labelFontSize,
    textColor: style?.textColor ?? DEFAULT_CHART_STYLE.textColor,
    axisColor: style?.axisColor ?? DEFAULT_CHART_STYLE.axisColor,
    gridColor: style?.gridColor ?? DEFAULT_CHART_STYLE.gridColor,
    lineWidth: style?.lineWidth ?? DEFAULT_CHART_STYLE.lineWidth,
    pointSize: style?.pointSize ?? DEFAULT_CHART_STYLE.pointSize,
    pointOpacity: style?.pointOpacity ?? DEFAULT_CHART_STYLE.pointOpacity,
    globalOpacity: style?.globalOpacity ?? DEFAULT_CHART_STYLE.globalOpacity,
  };
}

export type ResolvedYDomain = {
  yMin: number;
  yMax: number;
  ticks: number[];
};

function niceStep(raw: number): number {
  if (!isFinite(raw) || raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  let step: number;
  if (frac < 1.5) step = 1;
  else if (frac < 3) step = 2;
  else if (frac < 7) step = 5;
  else step = 10;
  return step * pow;
}

// Resolves the Y domain and its tick values from the raw data min/max plus the
// optional axis overrides (yMin/yMax, startAtZero, tickCount).
export function resolveYDomain(dataMin: number, dataMax: number, config: ChartConfig): ResolvedYDomain {
  return resolveAxis(dataMin, dataMax, config, config.yMin, config.yMax);
}

// X-axis variant honoring xMin/xMax instead of yMin/yMax (scatter).
export function resolveXDomain(dataMin: number, dataMax: number, config: ChartConfig): ResolvedYDomain {
  return resolveAxis(dataMin, dataMax, config, config.xMin, config.xMax);
}

function resolveAxis(dataMin: number, dataMax: number, config: ChartConfig, minOv?: number, maxOv?: number): ResolvedYDomain {
  const startAtZero = config.startAtZero ?? true;
  let rawMin = startAtZero ? Math.min(0, dataMin) : dataMin;
  let rawMax = dataMax > rawMin ? dataMax : rawMin + 1;
  if (maxOv !== undefined) rawMax = maxOv;
  if (minOv !== undefined) rawMin = minOv;
  const rawStep = (rawMax - rawMin) / Math.max(2, config.tickCount ?? 5);
  const step = niceStep(rawStep);
  const yMin = Math.floor(rawMin / step) * step;
  const yMax = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return {yMin, yMax, ticks};
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

export type MultiSeriesDatum = {
  name: string;
  values: number[];
  color: string;
};

export type PreparedMultiSeries = {
  categories: string[];
  series: MultiSeriesDatum[];
  max: number;
  categoryTotals: number[];
};

const AGGREGATES = ['sum', 'avg', 'count', 'min', 'max', 'count_distinct'] as const;
type AggregateFn = typeof AGGREGATES[number];

function reduceVals(vals: number[], agg?: AggregateFn): number {
  if (vals.length === 0) return 0;
  switch (agg) {
    case 'avg':
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    case 'max':
      return Math.max(...vals);
    case 'min':
      return Math.min(...vals);
    case 'count':
      return vals.length;
    case 'count_distinct':
      return new Set(vals).size;
    case 'sum':
    default:
      return vals.reduce((a, b) => a + b, 0);
  }
}

/**
 * Prepares a multi-series dataset from raw rows (static builder charts only).
 * Groups rows by `config.seriesField` into named series; categories come from
 * `config.xField`. Leaves `prepareSeries`/`toSeries` untouched so the animated
 * (Remotion) templates keep their single-series behavior.
 *
 * When no seriesField is set, produces a single series (a flat category->value
 * mapping), matching the legacy single-series rendering. LegendItem overrides
 * map by series label to re-color individual series.
 */
export function prepareMultiSeries(
  data: Record<string, unknown>[],
  config: ChartConfig,
): PreparedMultiSeries {
  const rows = data ?? [];
  const empty: PreparedMultiSeries = {categories: [], series: [], max: 0, categoryTotals: []};
  if (rows.length === 0) return empty;

  let xField = config.xField;
  let yField = config.yField;
  const seriesField = config.seriesField;
  if (!xField || !rows[0] || !(xField in rows[0])) xField = pickAutoField(rows[0], 'category');
  if (!yField || !rows[0] || !(yField in rows[0])) yField = pickAutoField(rows[0], 'value');
  if (!xField) xField = Object.keys(rows[0])[0] ?? '';
  if (!yField) yField = Object.keys(rows[0])[1] ?? xField;

  const categories: string[] = [];
  const catIndex = new Map<string, number>();
  const cellVals = new Map<string, number[]>();
  const seriesOrder: string[] = [];

  const cellKey = (seriesName: string, cat: string) => `${seriesName}\u0000${cat}`;

  for (const row of rows) {
    const cat = String(row[xField] ?? '');
    const val = Number(row[yField] ?? 0);
    if (isNaN(val)) continue;
    if (!catIndex.has(cat)) {
      catIndex.set(cat, categories.length);
      categories.push(cat);
    }
    let seriesName: string;
    if (seriesField) {
      const raw = row[seriesField];
      seriesName = raw === null || raw === undefined || String(raw) === '' ? '(vacío)' : String(raw);
    } else {
      seriesName = config.title || 'Serie';
    }
    if (!seriesOrder.includes(seriesName)) seriesOrder.push(seriesName);
    const key = cellKey(seriesName, cat);
    if (!cellVals.has(key)) cellVals.set(key, []);
    cellVals.get(key)!.push(val);
  }

  const agg = config.aggregate as AggregateFn | undefined;
  const legendColors = new Map<string, string>();
  for (const li of config.legendItems ?? []) {
    if (li && typeof li.label === 'string' && li.color) legendColors.set(li.label, li.color);
  }

  const series: MultiSeriesDatum[] = seriesOrder.map((name, i) => ({
    name,
    values: categories.map((cat) => reduceVals(cellVals.get(cellKey(name, cat)) ?? [], agg)),
    color: legendColors.get(name) ?? pickColor(config.colors, i),
  }));

  const categoryTotals = categories.map((_, ci) =>
    series.reduce((s, se) => s + (se.values[ci] ?? 0), 0),
  );

  // Respect sortBy + limit the same way prepareSeries does, so the "Ordenar
  // por" and "Filas del gráfico" controls work for multi-series charts too.
  const indexOrder = categories.map((_, i) => i);
  const sortBy = config.sortBy ?? 'none';
  if (sortBy === 'value-desc' || sortBy === 'value-asc') {
    const dir = sortBy === 'value-desc' ? -1 : 1;
    indexOrder.sort((a, b) => (categoryTotals[a] - categoryTotals[b]) * dir);
  } else if (sortBy === 'label') {
    indexOrder.sort((a, b) => categories[a].localeCompare(categories[b]));
  }
  const orderedCategories = indexOrder.map((i) => categories[i]);
  const orderedTotals = indexOrder.map((i) => categoryTotals[i]);
  const orderedSeries = series.map((s) => ({
    ...s,
    values: indexOrder.map((i) => s.values[i] ?? 0),
  }));
  const limit = config.limit && config.limit > 0 ? config.limit : orderedCategories.length;
  const kept = orderedCategories.slice(0, limit);

  return {
    categories: kept,
    series: orderedSeries.map((s) => ({
      ...s,
      values: s.values.slice(0, limit),
    })),
    max: Math.max(
      ...orderedSeries.flatMap((s) => s.values),
      ...orderedTotals,
      0,
    ),
    categoryTotals: orderedTotals.slice(0, limit),
  };
}

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
