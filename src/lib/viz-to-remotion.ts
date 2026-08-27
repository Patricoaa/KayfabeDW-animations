import type {ChartConfig} from './chart-config';
import type {QuerySpec} from './query-spec';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import {matchTemplates} from './profile-matcher';

export type RemotionInputProps = {
  templateId: string;
  props: Record<string, unknown>;
};

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

function convertRankingBarras(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const labelCol = config.xField ?? Object.keys(data[0] ?? {})[0];
  const valueCol = config.yField ?? Object.keys(data[0] ?? {})[1];
  const items = data.slice(0, 15).map((d, i) => ({
    label: String(d[labelCol] ?? ''),
    value: Number(d[valueCol] ?? 0),
    color: config.colors?.[i % (config.colors?.length ?? 12)] ?? DEFAULT_COLORS[i % 12],
  }));
  return {
    title: config.title ?? '',
    items,
    maxValue: Math.max(...items.map((i) => i.value), 0),
  };
}

function convertHeadToHead(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const nameCol = config.xField ?? Object.keys(data[0] ?? {})[0];
  const valueCol = config.yField ?? Object.keys(data[0] ?? {})[1];
  const drawsCol = Object.keys(data[0] ?? {}).find((k) => k.toLowerCase().includes('draw'));

  return {
    wrestlerA: String(data[0]?.[nameCol] ?? ''),
    wrestlerB: String(data[1]?.[nameCol] ?? ''),
    winsA: Number(data[0]?.[valueCol] ?? 0),
    winsB: Number(data[1]?.[valueCol] ?? 0),
    draws: drawsCol ? Number(data[0]?.[drawsCol] ?? 0) : 0,
  };
}

function convertStatsKpi(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const labelCol = config.xField ?? Object.keys(data[0] ?? {})[0];
  const valueCol = config.yField ?? Object.keys(data[0] ?? {})[1];
  return {
    label: config.title ?? String(data[0]?.[labelCol] ?? ''),
    value: Number(data[0]?.[valueCol] ?? 0),
    color: config.colors?.[0] ?? '#3b82f6',
  };
}

function convertWinStreak(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const nameCol = config.xField ?? Object.keys(data[0] ?? {})[0];
  const valueCol = config.yField ?? Object.keys(data[0] ?? {})[1];
  const name = String(data[0]?.[nameCol] ?? '');
  const count = data.length;

  return {
    wrestlerName: name,
    streakCount: count,
    matchType: config.title ?? 'Victoria',
    events: data.map((d) => String(d[nameCol] ?? '')),
    promotionColor: config.colors?.[0] ?? '#FFD700',
  };
}

function convertTimelineReinados(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const labelCol = config.xField ?? Object.keys(data[0] ?? {})[0];
  const valueCol = config.yField ?? Object.keys(data[0] ?? {})[1];
  const endCol = Object.keys(data[0] ?? {}).find((k) => k.toLowerCase().includes('end'));
  const defensesCol = Object.keys(data[0] ?? {}).find((k) => k.toLowerCase().includes('defense'));

  const champion = String(data[0]?.[labelCol] ?? '');
  const title = config.title ?? '';

  const reigns = data.map((d) => ({
    start: String(d[labelCol] ?? ''),
    end: endCol ? (d[endCol] ? String(d[endCol]) : null) : null,
    days: Number(d[valueCol] ?? 0),
    defenses: defensesCol ? Number(d[defensesCol] ?? 0) : 0,
  }));

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

function pickSeries(data: Record<string, unknown>[], config: ChartConfig): {label: string; value: number; color: string}[] {
  const labelCol = config.xField ?? Object.keys(data[0] ?? {})[0];
  const valueCol = config.yField ?? Object.keys(data[0] ?? {})[1];
  const colorCol = config.colorField;
  return data.map((d, i) => ({
    label: String(d[labelCol] ?? ''),
    value: Number(d[valueCol] ?? 0),
    color: colorCol
      ? String(d[colorCol] ?? config.colors?.[i % (config.colors?.length ?? 12)] ?? DEFAULT_COLORS[i % 12])
      : config.colors?.[i % (config.colors?.length ?? 12)] ?? DEFAULT_COLORS[i % 12],
  }));
}

function convertGenericBar(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  return {
    title: config.title ?? '',
    series: pickSeries(data, config),
    numberFormat: config.numberFormat ?? 'short',
  };
}

function convertGenericLine(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  return {
    title: config.title ?? '',
    series: pickSeries(data, config),
    numberFormat: config.numberFormat ?? 'short',
  };
}

function convertGenericKpi(data: Record<string, unknown>[], config: ChartConfig): Record<string, unknown> {
  const labelCol = config.xField ?? Object.keys(data[0] ?? {})[0];
  const valueCol = config.yField ?? Object.keys(data[0] ?? {})[1];
  return {
    title: config.title ?? String(data[0]?.[labelCol] ?? ''),
    value: Number(data[0]?.[valueCol] ?? 0),
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

export function isGenericTemplate(templateId: string): boolean {
  return (GENERIC_TEMPLATE_IDS as readonly string[]).includes(templateId);
}

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
  _spec: QuerySpec,
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
