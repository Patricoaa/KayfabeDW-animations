export type ChartType = 'bar' | 'pie' | 'line' | 'area' | 'scatter' | 'table';

export type NumberFormat = 'none' | 'short' | 'percent' | 'currency' | 'decimal';

export type SortBy = 'none' | 'value-desc' | 'value-asc' | 'label';

export type LegendPosition = 'top' | 'right' | 'bottom';

export type GroupMode = 'grouped' | 'stacked';

export type ChartFilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'is_empty' | 'is_not_empty';

export type ChartFilter = {
  column: string;
  op: ChartFilterOp;
  value?: string;
};

export type ChartConfig = {
  type: ChartType;
  title?: string;
  xField?: string;
  yField?: string;
  categoryField?: string;
  valueField?: string;
  colorField?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showLabels?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  animation?: boolean;
  width?: number;
  height?: number;
  // E2E additions
  xLabel?: string;
  yLabel?: string;
  legendPosition?: LegendPosition;
  numberFormat?: NumberFormat;
  sortBy?: SortBy;
  limit?: number;
  labelAngle?: number;
  lineSmooth?: boolean;
  showDataLabels?: boolean;
  groupMode?: GroupMode;
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct';
  // Post-capture row filters applied on the captured dataset (step 2), not SQL.
  filters?: ChartFilter[];
  configVersion?: number;
};

export const CHART_CONFIG_VERSION = 2;

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  type: 'bar',
  title: '',
  // V7: Colorblind-friendly palette (Wong 2011 + adapted)
  colors: [
    '#0072B2', '#E69F00', '#009E73', '#F0E442',
    '#56B4E9', '#D55E00', '#CC79A7', '#999999',
    '#332288', '#88CCEE', '#44AA99', '#117733',
  ],
  showGrid: true,
  showLegend: true,
  showLabels: true,
  horizontal: false,
  stacked: false,
  animation: true,
  legendPosition: 'bottom',
  numberFormat: 'short',
  sortBy: 'none',
  labelAngle: 0,
  lineSmooth: false,
  showDataLabels: true,
  groupMode: 'grouped',
  configVersion: CHART_CONFIG_VERSION,
};

export function applyChartDefaults(config: Partial<ChartConfig>): ChartConfig {
  return {...DEFAULT_CHART_CONFIG, ...config};
}
