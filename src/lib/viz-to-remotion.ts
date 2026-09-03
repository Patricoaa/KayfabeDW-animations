import type {ChartConfig} from './chart-config';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import {matchTemplates} from './profile-matcher';
import {prepareSeries, toSeries, type CanonicalSeries} from './chart-data';
import type {AnimationTemplateConfig, TimelineRaceConfig} from './animation-config';

export type RemotionInputProps = {
  templateId: string;
  props: Record<string, unknown>;
};

/**
 * Single source of truth for series-shaped data. All converters go through
 * `prepareSeries` (same pipeline as the static charts), so the animated and
 * static representations of the same query always agree on labels, values,
 * aggregation, sort, limit and colors.
 */
function buildSeries(data: Record<string, unknown>[], config: ChartConfig): CanonicalSeries[] {
  if (!data || data.length === 0) return [];
  return toSeries(prepareSeries(data, config));
}

function convertRankingBarras(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const items = buildSeries(data, config).slice(0, 15);
  return {
    title: config.title ?? '',
    items,
    maxValue: Math.max(...items.map((i) => i.value), 0),
  };
}

function convertHeadToHead(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const items = buildSeries(data, config);
  const drawsCol = Object.keys(data[0] ?? {}).find((k) => k.toLowerCase().includes('draw'));

  return {
    wrestlerA: items[0]?.label ?? '',
    wrestlerB: items[1]?.label ?? '',
    winsA: items[0]?.value ?? 0,
    winsB: items[1]?.value ?? 0,
    draws: drawsCol ? Number(data[0]?.[drawsCol] ?? 0) : 0,
  };
}

function convertStatsKpi(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const prepared = prepareSeries(data, config);
  return {
    label: config.title ?? prepared.items[0]?.label ?? '',
    value: prepared.items[0]?.value ?? 0,
    color: config.colors?.[0] ?? '#3b82f6',
  };
}

function convertWinStreak(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const prepared = prepareSeries(data, config);
  const name = prepared.items[0]?.label ?? '';

  return {
    wrestlerName: name,
    streakCount: data.length,
    matchType: config.title ?? 'Victoria',
    events: prepared.items.map((i) => i.label),
    promotionColor: config.colors?.[0] ?? '#FFD700',
  };
}

// Resolve an image-URL column value to a usable avatar URL (mirrors the static
// bar-chart avatar convention: only absolute/data/root-relative URLs count).
function avatarUrlOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (t === '') return null;
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:image/') || t.startsWith('/')) return t;
  return null;
}

function parseDateValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const t = new Date(value).getTime();
    return isNaN(t) ? null : t;
  }
  const s = String(value).trim();
  if (s === '') return null;
  if (!isNaN(Number(s))) {
    const n = Number(s);
    if (n < 1e10) return null; // not an epoch ms; treat as non-date
    const t = new Date(n).getTime();
    return isNaN(t) ? null : t;
  }
  // ISO 8601 (with or without time)
  const iso = Date.parse(s);
  if (!isNaN(iso)) return iso;
  // DD/MM/YYYY or DD-MM-YYYY (day first — common in es locales)
  const dm = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+.*)?$/);
  if (dm) {
    const [_, d, mo, y] = dm;
    let year = Number(y);
    if (year < 100) year += 2000;
    const t = new Date(year, Number(mo) - 1, Number(d)).getTime();
    if (!isNaN(t)) return t;
  }
  return null;
}

function convertTimelineRace(
  data: Record<string, unknown>[],
  config: ChartConfig,
  tc?: TimelineRaceConfig,
): Record<string, unknown> {
  const rows = data ?? [];
  if (rows.length === 0) {
    return {title: (tc?.title || config.title) ?? '', items: [], accentColor: config.colors?.[0] ?? '#FFD700', dateMode: false};
  }

  // Explicit per-template column mapping wins; otherwise fall back to the
  // inherited static xField/yField plus heuristic detection.
  const labelField = tc?.labelField ?? config.xField ?? Object.keys(rows[0])[0];
  const valueField = tc?.valueField ?? config.yField;
  const imageField = tc?.imageField;
  const startField =
    tc?.dateField ??
    Object.keys(rows[0]).find((k) =>
      k.toLowerCase().includes('date') || k.toLowerCase().includes('fecha') ||
      k.toLowerCase().includes('inicio') || k.toLowerCase().includes('start'));

  const items = rows
    .map((row) => ({
      label: String(row[labelField] ?? ''),
      image: imageField ? avatarUrlOf(row[imageField]) : null,
      date: startField ? parseDateValue(row[startField]) : null,
      value: Number(row[valueField ?? Object.keys(row)[1] ?? ''] ?? 0),
    }))
    .filter((it) => !isNaN(it.value));

  // dateMode only when we actually parsed dates for at least two rows.
  const dates = items.map((i) => i.date).filter((d): d is number => d != null);
  const dateMode = dates.length >= 2;

  if (!dateMode) {
    // Compat: simple parallel bar ordered by value (no sweeping guide).
    const sorted = [...items].sort((a, b) => b.value - a.value);
    return {
      title: (tc?.title || config.title) ?? '',
      items: sorted,
      accentColor: config.colors?.[0] ?? '#FFD700',
      dateMode: false,
      maxRows: tc?.maxRows,
      showYAxis: tc?.showYAxis,
      showRefLine: tc?.showRefLine,
      showDateLabel: tc?.showDateLabel,
      axisPosition: tc?.axisPosition,
    };
  }

  const min = Math.min(...dates);
  const max = Math.max(...dates);

  // ---- Accumulate per participant ----
  // Group each participant's events by time period (day/month/year per
  // dateFormat), then compute a running cumulative value so that when the
  // sweeping guide crosses a participant's date, its bar jumps to the total
  // up to that moment. Items are emitted as steps (label repeats); the
  // template renders one row per distinct label.
  const fmt = tc?.dateFormat ?? 'day';
  const periodStart = (t: number, f: typeof fmt): number => {
    const d = new Date(t);
    if (f === 'year') return new Date(d.getFullYear(), 0, 1).getTime();
    if (f === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const byLabel = new Map<string, {image: string | null; steps: {period: number; value: number}[]}>();
  for (const it of items) {
    if (it.date == null || it.label === '') continue;
    let entry = byLabel.get(it.label);
    if (!entry) {
      entry = {image: it.image, steps: []};
      byLabel.set(it.label, entry);
    }
    entry.steps.push({period: periodStart(it.date, fmt), value: it.value});
  }

  const steps: {label: string; image: string | null; date: number; value: number}[] = [];
  for (const [label, entry] of byLabel) {
    // Sum values within each period.
    const summed = new Map<number, number>();
    for (const s of entry.steps) {
      summed.set(s.period, (summed.get(s.period) ?? 0) + s.value);
    }
    const ordered = Array.from(summed.entries()).sort((a, b) => a[0] - b[0]);
    let running = 0;
    for (const [period, v] of ordered) {
      running += v;
      steps.push({label, image: entry.image, date: period, value: running});
    }
  }

  if (steps.length === 0) {
    return {
      title: (tc?.title || config.title) ?? '',
      items: [],
      accentColor: config.colors?.[0] ?? '#FFD700',
      dateMode: true,
      domain: [min, max] as [number, number],
      maxRows: tc?.maxRows,
      showYAxis: tc?.showYAxis,
      showRefLine: tc?.showRefLine,
      showDateLabel: tc?.showDateLabel,
      axisPosition: tc?.axisPosition,
    };
  }

  const stepDates = steps.map((s) => s.date);
  const sMin = Math.min(...stepDates);
  const sMax = Math.max(...stepDates);

  // Stable sort by value (per-frame ranking happens in the template); here we
  // keep steps grouped by label but ordered by date for a defined output.
  steps.sort((a, b) => a.label.localeCompare(b.label) || a.date - b.date);

  return {
    title: (tc?.title || config.title) ?? '',
    items: steps,
    accentColor: config.colors?.[0] ?? '#FFD700',
    dateMode: true,
    dateFormat: fmt,
    domain: [sMin, sMax] as [number, number],
    maxRows: tc?.maxRows,
    showYAxis: tc?.showYAxis,
    showRefLine: tc?.showRefLine,
    showDateLabel: tc?.showDateLabel,
      axisPosition: tc?.axisPosition,
  };
}

function convertHeatmapLuchas(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const rowCol = Object.keys(data[0] ?? {}).find((k) => k.toLowerCase().includes('row') || k.toLowerCase().includes('promotion') || k.toLowerCase().includes('category')) ?? Object.keys(data[0] ?? {})[0];
  const colCol = Object.keys(data[0] ?? {}).find((k) => k.toLowerCase().includes('col') || k.toLowerCase().includes('year') || k.toLowerCase().includes('period')) ?? Object.keys(data[0] ?? {})[1];
  const valCol = config.yField ?? Object.keys(data[0] ?? {})[2];

  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const cells = data.map((d) => {
    const row = String(d[rowCol] ?? '');
    const col = String(d[colCol] ?? '');
    rowSet.add(row);
    colSet.add(col);
    return {row, col, value: Number(d[valCol] ?? 0)};
  });

  return {
    title: config.title ?? '',
    rows: Array.from(rowSet),
    cols: Array.from(colSet),
    cells,
    colorScale: ['#1e293b', '#f59e0b'] as [string, string],
  };
}

function convertGenericBar(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  return {
    title: config.title ?? '',
    series: buildSeries(data, config),
    numberFormat: config.numberFormat ?? 'short',
  };
}

function convertGenericLine(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  return {
    title: config.title ?? '',
    series: buildSeries(data, config),
    numberFormat: config.numberFormat ?? 'short',
  };
}

function convertGenericKpi(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const prepared = prepareSeries(data, config);
  return {
    title: config.title ?? prepared.items[0]?.label ?? '',
    value: prepared.items[0]?.value ?? 0,
    color: config.colors?.[0] ?? '#3b82f6',
  };
}

const CONVERTERS: Record<string, (data: Record<string, unknown>[], config: ChartConfig, templateConfig?: unknown) => Record<string, unknown>> = {
  'ranking-barras': convertRankingBarras,
  'head-to-head': convertHeadToHead,
  'stats-kpi': convertStatsKpi,
  'win-streak': convertWinStreak,
  'timeline-race': (data, config, tc) => convertTimelineRace(data, config, tc as TimelineRaceConfig | undefined),
  'heatmap-luchas': convertHeatmapLuchas,
  'generic-bar': convertGenericBar,
  'generic-line': convertGenericLine,
  'generic-kpi': convertGenericKpi,
};

const GENERIC_TEMPLATE_IDS = ['generic-bar', 'generic-line', 'generic-kpi'] as const;

export function getCompatibleTemplates(
  config: ChartConfig,
  data: Record<string, unknown>[],
): {templateId: string; label: string; score: number}[] {
  if (data.length === 0) return [];

  const columns = Object.keys(data[0]);
  const matches = matchTemplates(columns, data);

  const result = matches.map((m) => {
    const entry = TEMPLATES[m.templateId];
    return {
      templateId: m.templateId,
      label: entry?.meta.name ?? m.templateId,
      score: m.score,
    };
  });

  // Always offer the generic animated templates when there's at least one
  // numeric column and one label-ish column, so any query can be animated.
  const hasNumeric = columns.some((c) =>
    typeof data[0][c] === 'number' || (!isNaN(Number(data[0][c])) && data[0][c] !== ''),
  );
  if (hasNumeric) {
    for (const id of GENERIC_TEMPLATE_IDS) {
      const entry = TEMPLATES[id];
      if (!entry) continue;
      if (!result.some((r) => r.templateId === id)) {
        result.push({templateId: id, label: entry.meta.name, score: 40});
      }
    }
  }

  return result;
}

export function convertToRemotionProps(
  config: ChartConfig,
  data: Record<string, unknown>[],
  templateId: string,
  templateConfig?: AnimationTemplateConfig,
): RemotionInputProps | null {
  const converter = CONVERTERS[templateId];
  if (!converter) return null;

  const tc = templateId === 'timeline-race' ? templateConfig?.['timeline-race'] : undefined;

  return {
    templateId,
    props: converter(data, config, tc),
  };
}

export function suggestBestTemplate(
  config: ChartConfig,
  data: Record<string, unknown>[],
): string | null {
  const templates = getCompatibleTemplates(config, data);
  return templates[0]?.templateId ?? null;
}
