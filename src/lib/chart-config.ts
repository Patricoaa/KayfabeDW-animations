export type ChartType = 'bar' | 'pie' | 'line' | 'area' | 'scatter' | 'table';

export type NumberFormat = 'none' | 'short' | 'percent' | 'currency' | 'decimal';

export type SortBy = 'none' | 'value-desc' | 'value-asc' | 'label';

export type LegendPosition = 'top' | 'right' | 'bottom';

export type GroupMode = 'grouped' | 'stacked';

export type AvatarShape = 'circle' | 'rounded';
export type AvatarPosition = 'above' | 'beside-label' | 'replace-label' | 'bar-end';

export type ChartFilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'is_empty' | 'is_not_empty';

export type ChartFilter = {
  column: string;
  op: ChartFilterOp;
  value?: string;
};

export type ChartStyle = {
  fontFamily?: string;
  titleFontSize?: number;
  titleColor?: string;
  labelFontSize?: number;
  textColor?: string;
  axisColor?: string;
  gridColor?: string;
  lineWidth?: number;
  pointSize?: number;
  pointOpacity?: number;
  globalOpacity?: number;
};

export const PALETTES: {name: string; colors: string[]}[] = [
  {
    name: 'Colorblind (Wong)',
    colors: [
      '#0072B2', '#E69F00', '#009E73', '#F0E442',
      '#56B4E9', '#D55E00', '#CC79A7', '#999999',
      '#332288', '#88CCEE', '#44AA99', '#117733',
    ],
  },
  {
    name: 'Vivid',
    colors: ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#8338ec', '#d00000', '#fb8500', '#606c38'],
  },
  {
    name: 'Pastel',
    colors: ['#a8dadc', '#457b9d', '#f1faee', '#e9c46a', '#f4a261', '#e76f51', '#bde0fe', '#cdb4db'],
  },
  {
    name: 'Mono (grises)',
    colors: ['#1f2937', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#111827', '#374151', '#8b5cf6'],
  },
];

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
  // F1: multi-series. `seriesField` groups rows into named series (grouped by
  // xField category); when unset the chart renders a single series using
  // yField. `legendItems` overrides the per-series colors shown in the legend.
  seriesField?: string;
  legendItems?: {label: string; color: string}[];
  showMarkers?: boolean;
  // F2: visual style overrides. All fields optional; the renderers resolve
  // against sensible defaults via resolveChartStyle in chart-data.
  style?: ChartStyle;
  // F3: per-chart-type controls.
  innerRadius?: number;        // pie: 0 (tarta) a >0 (donut)
  sliceLimit?: number;         // pie: máx. segmentos a mostrar
  pieLabel?: 'none' | 'value' | 'percent' | 'both'; // pie: modo de etiqueta
  trendline?: boolean;         // scatter: línea de tendencia lineal
  lineDash?: boolean;          // line/area: línea discontinua
  tableSearch?: string;        // table: filtro por texto
  stickyHeader?: boolean;      // table: encabezado fijo
  // F4: lienzo y ejes (bart/line/area/scatter).
  tickCount?: number;          // cantidad de líneas de división en Y
  startAtZero?: boolean;       // forzar Y a partir de 0
  yMin?: number;
  yMax?: number;
  xMin?: number;
  xMax?: number;
  // Post-capture row filters applied on the captured dataset (step 2), not SQL.
  filters?: ChartFilter[];
  // Table-chart specific controls. `tableColumns` limits which dataset columns
  // render (empty = all); `tableLimit` caps the shown rows; `tableSort` orders
  // the rows by a column.
  tableColumns?: string[];
  tableLimit?: number;
  tableSort?: {column: string; direction: 'asc' | 'desc'};
  // F5: bar-chart avatars. When `avatarField` is set (an optional dataset column
  // holding absolute image URLs), each single-series bar renders that image.
  // Shape/radius/size/position are highly customizable.
  avatarField?: string;
  avatarShape?: AvatarShape;
  avatarRadius?: number;
  avatarSize?: number;
  avatarPosition?: AvatarPosition;
  configVersion?: number;
};

export const CHART_CONFIG_VERSION = 8;

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
  showMarkers: true,
  groupMode: 'grouped',
  avatarShape: 'circle',
  avatarRadius: 6,
  avatarSize: 24,
  avatarPosition: 'above',
  configVersion: CHART_CONFIG_VERSION,
};

export function applyChartDefaults(config: Partial<ChartConfig>): ChartConfig {
  return {...DEFAULT_CHART_CONFIG, ...config};
}
