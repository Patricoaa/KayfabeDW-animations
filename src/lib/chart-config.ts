export type ChartType = 'bar' | 'pie' | 'line' | 'area' | 'scatter' | 'table';

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
};

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  type: 'bar',
  title: '',
  colors: [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#f97316', '#eab308',
    '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  ],
  showGrid: true,
  showLegend: true,
  showLabels: true,
  horizontal: false,
  stacked: false,
  animation: true,
};

export function applyChartDefaults(config: Partial<ChartConfig>): ChartConfig {
  return {...DEFAULT_CHART_CONFIG, ...config};
}
