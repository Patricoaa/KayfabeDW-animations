import type {ChartConfig} from './chart-config';
import type {QuerySpec} from './query-spec';

export type RemotionInputProps = {
  templateId: string;
  props: Record<string, unknown>;
};

export type TemplateMapping = {
  templateId: string;
  label: string;
  matches: (config: ChartConfig, data: Record<string, unknown>[]) => boolean;
  convert: (config: ChartConfig, data: Record<string, unknown>[], spec: QuerySpec) => Record<string, unknown>;
};

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

function takeN(data: Record<string, unknown>[], n: number): Record<string, unknown>[] {
  return data.slice(0, n);
}

const TEMPLATE_MAPPINGS: TemplateMapping[] = [
  {
    templateId: 'ranking-barras',
    label: 'Ranking de Barras (animado)',
    matches: (config) => config.type === 'bar',
    convert: (config, data, spec) => {
      const xField = config.xField ?? Object.keys(data[0] ?? {})[0];
      const yField = config.yField ?? Object.keys(data[0] ?? {})[1];
      const items = takeN(data, 15).map((d, i) => ({
        label: String(d[xField] ?? ''),
        value: Number(d[yField] ?? 0),
        color: config.colors?.[i % (config.colors?.length ?? 12)] ?? DEFAULT_COLORS[i % 12],
      }));
      return {
        title: config.title ?? spec.table,
        items,
        maxValue: Math.max(...items.map((i) => i.value)),
      };
    },
  },
  {
    templateId: 'head-to-head',
    label: 'Head to Head',
    matches: (config, data) => config.type === 'bar' && data.length === 2,
    convert: (config, data) => {
      const xField = config.xField ?? Object.keys(data[0] ?? {})[0];
      const yField = config.yField ?? Object.keys(data[0] ?? {})[1];
      return {
        title: config.title ?? 'Head to Head',
        player1: {name: String(data[0][xField]), value: Number(data[0][yField])},
        player2: {name: String(data[1][xField]), value: Number(data[1][yField])},
      };
    },
  },
  {
    templateId: 'stats-kpi',
    label: 'KPI / Estadística',
    matches: (config, data) => config.type === 'bar' && data.length === 1,
    convert: (config, data) => {
      const yField = config.yField ?? Object.keys(data[0] ?? {})[1];
      const xField = config.xField ?? Object.keys(data[0] ?? {})[0];
      return {
        label: config.title ?? String(data[0][xField]),
        value: Number(data[0][yField] ?? 0),
        color: config.colors?.[0] ?? '#3b82f6',
      };
    },
  },
  {
    templateId: 'win-streak',
    label: 'Racha de Victorias',
    matches: (config, data) => config.type === 'line',
    convert: (config, data) => {
      const xField = config.xField ?? Object.keys(data[0] ?? {})[0];
      const yField = config.yField ?? Object.keys(data[0] ?? {})[1];
      const streak = data.map((d) => ({
        label: String(d[xField] ?? ''),
        value: Number(d[yField] ?? 0),
      }));
      return {
        title: config.title ?? 'Racha',
        streak,
      };
    },
  },
  {
    templateId: 'timeline-reinados',
    label: 'Timeline de Reinados',
    matches: (config, data) => config.type === 'area' || config.type === 'line',
    convert: (config, data) => {
      const xField = config.xField ?? Object.keys(data[0] ?? {})[0];
      const yField = config.yField ?? Object.keys(data[0] ?? {})[1];
      return {
        title: config.title ?? 'Timeline',
        events: data.map((d) => ({
          date: String(d[xField] ?? ''),
          value: Number(d[yField] ?? 0),
        })),
      };
    },
  },
];

export function getCompatibleTemplates(
  config: ChartConfig,
  data: Record<string, unknown>[],
): TemplateMapping[] {
  if (data.length === 0) return [];
  return TEMPLATE_MAPPINGS.filter((m) => m.matches(config, data));
}

export function convertToRemotionProps(
  config: ChartConfig,
  data: Record<string, unknown>[],
  spec: QuerySpec,
  templateId: string,
): RemotionInputProps | null {
  const mapping = TEMPLATE_MAPPINGS.find((m) => m.templateId === templateId);
  if (!mapping) return null;

  return {
    templateId,
    props: mapping.convert(config, data, spec),
  };
}

export function suggestBestTemplate(
  config: ChartConfig,
  data: Record<string, unknown>[],
): string | null {
  const templates = getCompatibleTemplates(config, data);
  return templates[0]?.templateId ?? null;
}
