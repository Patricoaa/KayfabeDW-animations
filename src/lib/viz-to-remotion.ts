import type {ChartConfig} from './chart-config';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import {matchTemplates} from './profile-matcher';
import {prepareSeries, toSeries, type CanonicalSeries} from './chart-data';

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

function convertTimelineReinados(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const prepared = prepareSeries(data, config);
  const endCol = Object.keys(data[0] ?? {}).find((k) => k.toLowerCase().includes('end'));
  const defensesCol = Object.keys(data[0] ?? {}).find((k) => k.toLowerCase().includes('defense'));

  const champion = prepared.items[0]?.label ?? '';
  const title = config.title ?? '';

  const reigns = prepared.items.map((item) => {
    const raw = (item.raw ?? {}) as Record<string, unknown>;
    return {
      start: item.label,
      end: endCol ? (raw[endCol] ? String(raw[endCol]) : null) : null,
      days: item.value,
      defenses: defensesCol ? Number(raw[defensesCol] ?? 0) : 0,
    };
  });

  return {
    championName: champion,
    titleName: title,
    reigns,
    promotionColor: config.colors?.[0] ?? '#FFD700',
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

const CONVERTERS: Record<string, (data: Record<string, unknown>[], config: ChartConfig) => Record<string, unknown>> = {
  'ranking-barras': convertRankingBarras,
  'head-to-head': convertHeadToHead,
  'stats-kpi': convertStatsKpi,
  'win-streak': convertWinStreak,
  'timeline-reinados': convertTimelineReinados,
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
): RemotionInputProps | null {
  const converter = CONVERTERS[templateId];
  if (!converter) return null;

  return {
    templateId,
    props: converter(data, config),
  };
}

export function suggestBestTemplate(
  config: ChartConfig,
  data: Record<string, unknown>[],
): string | null {
  const templates = getCompatibleTemplates(config, data);
  return templates[0]?.templateId ?? null;
}
