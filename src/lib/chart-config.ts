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
};

export function applyChartDefaults(config: Partial<ChartConfig>): ChartConfig {
  return {...DEFAULT_CHART_CONFIG, ...config};
}
