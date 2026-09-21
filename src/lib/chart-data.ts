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
  // Keep a representative source row per group so companion columns (e.g. an
  // image URL used for avatars, colors, etc.) survive the aggregation step.
  const sampleRow = new Map<string, Record<string, unknown>>();
  for (const row of data) {
    const key = String(row[groupField] ?? '');
    const val = Number(row[yField] ?? 0);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(isNaN(val) ? 0 : val);
    if (!distinct.has(key)) distinct.set(key, new Set());
    const raw = row[yField];
    distinct.get(key)!.add(raw === null || raw === undefined ? String(raw) : String(raw));
    if (!sampleRow.has(key)) sampleRow.set(key, row);
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
    return {
      ...(sampleRow.get(label) ?? {}),
      [groupField]: label,
      [yField]: value,
    };
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

export function formatValue(value: number, format: NumberFormat, percentDigits?: number): string {
  if (isNaN(value)) return '0';
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(percentDigits ?? 0)}%`;
    case 'currency':
      return value.toLocaleString('es', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
    case 'decimal':
      return value.toLocaleString('es', {maximumFractionDigits: 2});
    case 'short':
      if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
      return Math.round(value).toString();
    case 'duration': {
      const s = Math.round(Math.abs(value));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sign = value < 0 ? '-' : '';
      return h > 0 ? `${sign}${h}:${String(m).padStart(2, '0')}` : `${sign}${m}m`;
    }
    case 'none':
    default:
      return String(value);
  }
}

// Distribuye las cuotas de una categoría como strings de porcentaje que SUMAN
// 100 a la precisión elegida (método del mayor residuo). El redondeo
// independiente (`toFixed`) no garantiza la suma (33.3×3 = 99.9); aquí se
// trunca cada parte al piso y las unidades sobrantes hasta 100 se asignan a
// las partes con mayor residuo fraccional (empates resueltos por orden de
// serie, así el reparto es determinista).
export function percentShareParts(weights: number[], decimals = 0): string[] {
  const p = Math.max(0, Math.min(6, Math.floor(decimals) || 0));
  const scale = 10 ** p;
  const zero = `0${p > 0 ? '.' + '0'.repeat(p) : ''}%`;
  const positive = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = positive.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights.map(() => zero);
  const scaled = positive.map((w) => (w / total) * 100 * scale);
  const floor = scaled.map((x) => Math.floor(x));
  const buckets = Math.round(scaled.reduce((a, b) => a + b, 0));
  let rem = buckets - floor.reduce((a, b) => a + b, 0);
  const order = scaled
    .map((x, i) => ({i, frac: x - floor[i]}))
    .sort((a, b) => (b.frac - a.frac) || (a.i - b.i));
  const out = [...floor];
  for (const {i} of order) {
    if (rem <= 0) break;
    out[i] += 1;
    rem -= 1;
  }
  return out.map((v) => `${(v / scale).toFixed(p)}%`);
}

export function pickColor(colors: string[] | undefined, index: number): string {
  const palette = colors && colors.length ? colors : ['#6366f1'];
  return palette[index % palette.length];
}

// Resolves the color for a single datum: per-category override wins (F7
// "Colores por categoría/dato"), otherwise the palette by index.
export function colorFor(config: ChartConfig, label: string | number | null | undefined, index: number): string {
  const key = label === null || label === undefined ? '(vacío)' : String(label);
  const override = config.colorOverrides?.[key];
  if (override) return override;
  return pickColor(config.colors, index);
}

export type CategoryTextOverride = {label?: string; sub?: string};

// Normalizes a raw `categoryTextOverrides` entry for a category, or undefined
// when the category has no custom text. Display-only.
export function resolveCategoryTextOverride(
  config: ChartConfig,
  category: string | number | null | undefined,
): CategoryTextOverride | undefined {
  const key = category === null || category === undefined ? '' : String(category);
  const ov = config.categoryTextOverrides?.[key];
  if (typeof ov === 'string') return {label: ov};
  if (ov && typeof ov === 'object') return {label: ov.label, sub: ov.sub};
  return undefined;
}

// Display label for a category after applying per-category text overrides.
// `rowLabel` is an optional short label read from the dataset via
// `categoryLabelField`; it sits between the override and the raw key.
export function resolvedCategoryLabel(
  config: ChartConfig,
  category: string | number | null | undefined,
  rowLabel?: string | null,
): string {
  const key = category === null || category === undefined ? '' : String(category);
  const fallback = rowLabel && rowLabel.trim() !== ''
    ? rowLabel
    : key !== ''
      ? key
      : '(vacío)';
  const ov = resolveCategoryTextOverride(config, category);
  return ov?.label && ov.label.trim() !== '' ? ov.label : fallback;
}

// Description/subtitle line for a category. When the override defines a `sub`
// string it wins ('' explicitly hides the line); otherwise the fallback stays.
export function resolvedCategorySub(
  config: ChartConfig,
  category: string | number | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const ov = resolveCategoryTextOverride(config, category);
  if (ov && typeof ov.sub === 'string') return ov.sub;
  return fallback ?? null;
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

export type PieSlice = {
  label: string;
  value: number;
  color: string;
  // Ángulo en radianes, empezando en las 12 en punto (-π/2) y girando en el
  // sentido de las agujas del reloj. El renderer solo tiene que traducirlos a
  // arcos SVG.
  startAngle: number;
  endAngle: number;
  // Porcentaje numérico (0-100, sin redondeo) y su string formateado que SÍ
  // suma 100 (percentShareParts). El renderer usa percentLabel como etiqueta.
  percent: number;
  percentLabel: string;
};

// Prepara los datos de una torta: categorías → ángulos que suman 2π y colores
// del camino documentado para pie (colorOverrides → paleta). Reusa prepareSeries
// para la detección/agregación de campos. `sliceLimit` muestra los top-N por
// valor y fusiona el exceso en un slice sintético "Otros" (preserva el 100%).
export function preparePie(data: Record<string, unknown>[], config: ChartConfig): PieSlice[] {
  const prepared = prepareSeries(data, config);
  let items = prepared.items;

  const limit = config.sliceLimit ?? 0;
  if (limit > 0 && items.length > limit) {
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, limit);
    const rest = sorted.slice(limit);
    const restValue = rest.reduce((s, r) => s + r.value, 0);
    items = top.concat({
      label: 'Otros',
      value: restValue,
      color: pickColor(config.colors, limit),
      raw: undefined,
    });
  }

  const positives = items.filter((d) => Number.isFinite(d.value) && d.value > 0);
  if (positives.length === 0) return [];

  // Orden manual de los slices (sección Torta del builder). El resto no listado
  // (incl. "Otros") conserva el orden derivado al final, con "Otros" siempre el
  // último para no romper la lectura top-N.
  const order = config.categoryOrder;
  if (order && order.length > 0) {
    const pos = new Map(order.map((l, i) => [l, i]));
    positives.sort((a, b) => {
      if (b.label === 'Otros') return a.label === 'Otros' ? 0 : -1;
      if (a.label === 'Otros') return 1;
      const ia = pos.has(a.label) ? pos.get(a.label)! : order.length;
      const ib = pos.has(b.label) ? pos.get(b.label)! : order.length;
      return ia - ib;
    });
  }

  const total = positives.reduce((a, b) => a + b.value, 0);
  const percents = percentShareParts(positives.map((p) => p.value), 0);

  const twoPi = Math.PI * 2;
  // 0° = 12 en punto (-π/2); grados positivos giran en sentido horario (eje Y
  // SVG hacia abajo). `pieStartAngle` desplaza el arranque del primer slice.
  let angle = -Math.PI / 2 + (config.pieStartAngle ?? 0) * (Math.PI / 180);
  return positives.map((p, i) => {
    const sweep = (p.value / (total || 1)) * twoPi;
    const start = angle;
    angle = angle + sweep;
    return {
      label: p.label,
      value: p.value,
      color: colorFor(config, p.label, i),
      startAngle: start,
      endAngle: angle,
      percent: total ? (p.value / total) * 100 : 0,
      percentLabel: percents[i] ?? '0%',
    };
  });
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
  categoryImages?: (string | null)[];
  categoryDescriptions?: (string | null)[];
  categoryLabels?: (string | null)[];
  categoryIcons?: (string | null)[];
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

  const avatarField = config.avatarField;
  const categoryImages = new Map<string, string | null>();
  const descField = config.categoryDescriptionField;
  const categoryDescriptions = new Map<string, string | null>();
  const labelField = config.categoryLabelField;
  const categoryLabels = new Map<string, string | null>();
  const iconField = config.iconField;
  const categoryIcons = new Map<string, string | null>();

  for (const row of rows) {
    const cat = String(row[xField] ?? '');
    const val = Number(row[yField] ?? 0);
    // Capture the first valid avatar for each category (constant per category
    // row, e.g. an event image shared by every gender series of that event).
    if (avatarField && !categoryImages.has(cat)) {
      const rawImg = row[avatarField];
      const img =
        typeof rawImg === 'string' &&
        (rawImg.trim().startsWith('http://') ||
          rawImg.trim().startsWith('https://') ||
          rawImg.trim().startsWith('data:image/') ||
          rawImg.trim().startsWith('/'))
          ? rawImg.trim()
          : null;
      categoryImages.set(cat, img);
    }
    // Capture custom icon field from model if specified
    if (iconField && !categoryIcons.has(cat)) {
      const rawIcon = row[iconField];
      const ic = typeof rawIcon === 'string' ? rawIcon.trim() : null;
      categoryIcons.set(cat, ic ? ic : null);
    }
    // Capture the first non-empty description for each category the same way.
    if (descField && !categoryDescriptions.has(cat)) {
      const rawDesc = row[descField];
      const desc = rawDesc === null || rawDesc === undefined ? null : String(rawDesc);
      categoryDescriptions.set(cat, desc ? desc : null);
    }
    // Capture the first non-empty display label for the category (short column
    // name shown on the axis; the category key itself stays `xField`).
    if (labelField && !categoryLabels.has(cat)) {
      const rawLabel = row[labelField];
      const lab = rawLabel === null || rawLabel === undefined ? null : String(rawLabel);
      categoryLabels.set(cat, lab ? lab : null);
    }
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

  // El orden de las series (apilado / agrupado / leyenda) sigue `legendItems`
  // cuando está definido, de modo que el control "Orden de series" del panel
  // reordena el gráfico. Las series no listadas se anexan al final (orden de
  // aparición) para que ninguna se pierda.
  const liNames = (config.legendItems ?? []).map((li) => li.label);
  const orderedNames = [
    ...liNames.filter((n) => seriesOrder.includes(n)),
    ...seriesOrder.filter((n) => !liNames.includes(n)),
  ];
  const series: MultiSeriesDatum[] = orderedNames.map((name, i) => ({
    name,
    values: categories.map((cat) => reduceVals(cellVals.get(cellKey(name, cat)) ?? [], agg)),
    color: legendColors.get(name) ?? pickColor(config.colors, i),
  }));

  // Drop series that carry no data at all (every aggregated value 0), so they
  // draw nothing, don't show up in the legend, and don't skew grouping. Colors
  // are assigned above, before any filtering, so existing mappings survive.
  const visible = series.filter((s) => s.values.some((v) => v !== 0));

  const categoryTotals = categories.map((_, ci) =>
    visible.reduce((s, se) => s + (se.values[ci] ?? 0), 0),
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
  const orderedSeries = visible.map((s) => ({
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
    categoryImages: kept.map((cat) => categoryImages.get(cat) ?? null),
    categoryDescriptions: kept.map((cat) => categoryDescriptions.get(cat) ?? null),
    categoryLabels: kept.map((cat) => categoryLabels.get(cat) ?? null),
    categoryIcons: kept.map((cat) => categoryIcons.get(cat) ?? null),
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
