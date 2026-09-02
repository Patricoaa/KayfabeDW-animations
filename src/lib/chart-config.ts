export type ChartType = 'bar' | 'pie' | 'line' | 'area' | 'scatter' | 'table';

export type NumberFormat = 'none' | 'short' | 'percent' | 'currency' | 'decimal' | 'duration';

export type SortBy = 'none' | 'value-desc' | 'value-asc' | 'label';

export type LegendPosition = 'top' | 'right' | 'bottom';

export type GroupMode = 'grouped' | 'stacked' | 'stacked-percent';

export type AvatarShape = 'circle' | 'rounded';
export type AvatarPosition = 'axis-start' | 'bar-end' | 'inside-start' | 'inside-end';
// Per-avatar frame adjustment: `zoom` scales the source image inside the fixed
// frame (1 = fit/crop, >1 = zoom in). `focusX`/`focusY` (-1..1) shift the
// visible crop within the frame (0 = centered).
export type AvatarCrop = {zoom?: number; focusX?: number; focusY?: number};

export type FontWeight = 400 | 500 | 600 | 700;

// How text that exceeds its box/limit is treated per section.
export type TextOverflow = 'truncate' | 'wrap' | 'none';
export const TEXT_OVERFLOWS: {value: TextOverflow; label: string}[] = [
  {value: 'truncate', label: 'Recortar'},
  {value: 'wrap', label: 'Envolver'},
  {value: 'none', label: 'Sin límite'},
];

// Category label placement. 'hide' draws no category label; `*out` places
// labels beside the bar/column (start, center, end); `*in` places them over
// the bar body. 'axis' (default) keeps labels on the axis line.
export type CategoryLabelPosition = 'hide' | 'axis' | 'start-out' | 'center-out' | 'end-out' | 'start-in' | 'center-in' | 'end-in';

// Per-section text style. Every field is optional: empty sections "inherit"
// from the general chart typography (style.fontFamily / textColor / labelFontSize).
export type SectionFont = {
  fontFamily?: string;
  color?: string;
  size?: number;
  weight?: FontWeight;
  overflow?: TextOverflow;
};

// Canva-style free-form placement for title/subtitle blocks. All fields are
// optional; unset values fall back to the classic centered header behavior.
export type TextLayout = {
  // Horizontal anchor edge. 'left' = x px from the left edge; 'right' = x px
  // from the right edge; 'center' = x is an offset from the canvas center.
  anchor?: 'left' | 'center' | 'right';
  x?: number;          // px along the anchor edge
  y?: number;          // px from the top edge (0 = top)
  rotation?: number;   // degrees, clockwise around the anchor point
  align?: 'left' | 'center' | 'right'; // text alignment around the anchor x
  letterSpacing?: number; // px between glyphs
  lineHeight?: number;    // px between wrapped lines (default = size + 2)
  opacity?: number;       // 0..1 text opacity
  color?: string;         // overrides the section font color
  bgColor?: string;       // background box fill (none if omitted)
  bgOpacity?: number;     // background box opacity (default 1)
  bgPadding?: number;     // padding around the text box
  bgRadius?: number;      // corner radius of the background box
};

export const FONT_WEIGHTS: {value: FontWeight; label: string}[] = [
  {value: 400, label: 'Regular'},
  {value: 500, label: 'Medio'},
  {value: 600, label: 'Semibold'},
  {value: 700, label: 'Negrita'},
];

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

// Curated font presets (loaded via next/font/google in src/app/layout.tsx).
// The `family` value is the CSS variable that resolves to the @font-face
// family name, so charts referencing it get the real loaded font face.
export const FONT_PRESETS: {name: string; family: string}[] = [
  {name: 'Inter', family: 'var(--font-inter)'},
  {name: 'JetBrains Mono', family: 'var(--font-jetbrains-mono)'},
  {name: 'Playfair Display', family: 'var(--font-playfair-display)'},
  {name: 'Space Grotesk', family: 'var(--font-space-grotesk)'},
  {name: 'Montserrat', family: 'var(--font-montserrat)'},
  {name: 'Poppins', family: 'var(--font-poppins)'},
  {name: 'Merriweather', family: 'var(--font-merriweather)'},
  {name: 'Lora', family: 'var(--font-lora)'},
  {name: 'Oswald', family: 'var(--font-oswald)'},
  {name: 'Bebas Neue', family: 'var(--font-bebas-neue)'},
];

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
  subtitle?: string;
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
  // `label` is the series key used to match; `overrideLabel` (opcional) cambia
  // el texto visible en la leyenda sin romper el matching de color.
  seriesField?: string;
  legendItems?: {label: string; color: string; overrideLabel?: string}[];
  // V18: texto visible en la leyenda por label original (aplica a TODOS los
  // tipos, incluidos los leyendas por categoría de pie/scatter). Tiene prioridad
  // sobre `legendItems[].overrideLabel`. Vale solo para display; no afecta matching.
  legendTextOverrides?: Record<string, string>;
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
  // Rounded-rect is the default shape (fits promo/logo photos); `avatarRadius`
  // overrides the proportional default of 25% of `avatarSize`.
  avatarField?: string;
  avatarShape?: AvatarShape;
  avatarRadius?: number;
  avatarSize?: number;
  avatarPosition?: AvatarPosition;
  // V18: separación del avatar respecto a la barra/eje (px) cuando se ancla en
  // `axis-start`/`bar-end` (fuera) o pegado al extremo en `inside-*`.
  avatarOffset?: number;
  // V18: ajuste de recorte por categoría (zoom del encuadre + foco X/Y dentro del
  // marco). Key = valor ORIGINAL de la categoría. Solo display.
  avatarCrops?: Record<string, AvatarCrop>;

  // F7: optional second dataset column rendered as a small description line
  // under each category label (like `avatarField` but text). Its font is
  // configured from the Eje X / Categoría section via `categoryDescriptionFont`.
  categoryDescriptionField?: string;
  categoryDescriptionFont?: SectionFont;

  // F6: granular bar styling (Flourish-like editor).
  barRadius?: number;              // corner radius of bars (px)
  barBorderColor?: string;         // stroke around each bar
  barBorderWidth?: number;         // stroke width (0 = off)
  barGap?: number;                 // px gap between bars in the same category
  barCategoryGap?: number;         // 0-0.5 fraction of the band used as side padding
  negativeColor?: string;          // color for negative-value bars (single/grouped)
  // Pill-bar look: corner radius applies only to the outer end of each bar.
  // Only available/functional for stacked bar modes (the Flourish "rounded
  // stacked" treat); grouped/single bars always use the plain radius.
  barRadiusEndsOnly?: boolean;

  // Data labels (independent of the series/axis text colors).
  dataLabelPosition?: 'auto' | 'inside' | 'outside' | 'center';
  // V16: migrated to a SectionFont (`dataLabelFont`). The flat fields below
  // are kept only as legacy fallbacks when reading old saved configs.
  dataLabelFontSize?: number;
  dataLabelColor?: string;
  dataLabelFontFamily?: string;
  dataLabelFont?: SectionFont;

  // Per-category display overrides for the x-axis labels and their description
  // lines (subtitles), keyed by the ORIGINAL category value. Display-only; they
  // never affect color assignment, sorting or aggregation keys.
  categoryTextOverrides?: Record<string, string | {label?: string; sub?: string}>;

  // Category (x) label placement + its own font. Only applies to bar charts.
  categoryLabelPosition?: CategoryLabelPosition;

  // Per-section font overrides (inherit general typography when unset).
  headerFont?: SectionFont;
  subtitleFont?: SectionFont;
  xLabelFont?: SectionFont;
  yLabelFont?: SectionFont;
  legendFont?: SectionFont;

  // Canva-style free-form placement for title/subtitle blocks. When set,
  // overrides the classic centered header layout for that block.
  titleLayout?: TextLayout;
  subtitleLayout?: TextLayout;

  // Per-category/per-datum color overrides (label -> color), applied before
  // the palette for single-series bars, pie slices, scatter categories and
  // single-series lines/areas.
  colorOverrides?: Record<string, string>;

  // Canvas frame (drawn inside the SVG so it survives export).
  canvasBackground?: string;
  canvasBorderColor?: string;
  canvasBorderWidth?: number;
  canvasBorderRadius?: number;
  canvasPreset?: string;

  // Spacing / margin overrides per zone.
  spacing?: {
    headerPadding?: number;
    legendSpacing?: number;
    plotMarginTop?: number;
    plotMarginRight?: number;
    plotMarginBottom?: number;
    plotMarginLeft?: number;
  };

  // Horizontal reference / target lines drawn over the plot.
  referenceLines?: {value: number; label?: string; color?: string; dash?: boolean}[];

  // Hover tooltips.
  tooltipEnabled?: boolean;

  configVersion?: number;
};

export const CHART_CONFIG_VERSION = 18;

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  type: 'bar',
  title: '',
  subtitle: '',
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
  avatarShape: 'rounded',
  avatarSize: 24,
  avatarPosition: 'bar-end',
  barRadius: 2,
  barBorderWidth: 0,
  barGap: 2,
  barCategoryGap: 0.15,
  dataLabelPosition: 'auto',
  dataLabelFontSize: 10,
  dataLabelColor: '#cccccc',
  categoryLabelPosition: 'axis',
  barRadiusEndsOnly: false,
  canvasBorderRadius: 0,
  canvasBorderWidth: 0,
  spacing: {
    headerPadding: 0,
    legendSpacing: 0,
    plotMarginTop: 24,
    plotMarginRight: 24,
    plotMarginBottom: 66,
    plotMarginLeft: 66,
  },
  tooltipEnabled: true,
  configVersion: CHART_CONFIG_VERSION,
};

export function applyChartDefaults(config: Partial<ChartConfig>): ChartConfig {
  // V14: avatar positions were reformulated (no more replace-label/below/inside).
  // V15: avatar positions re-anchored to the bar (4 positions: axis-start, bar-end,
  //      inside-start, inside-end).
  if (!config) return DEFAULT_CHART_CONFIG;
  let clean = config;
  if ('barGradient' in clean || 'canvasShadow' in clean) {
    const legacy = clean as Partial<ChartConfig> & Record<string, unknown>;
    const {barGradient, canvasShadow, ...rest} = legacy;
    void barGradient;
    void canvasShadow;
    clean = rest as Partial<ChartConfig>;
  }
  const validAvatarPositions = ['axis-start', 'bar-end', 'inside-start', 'inside-end'];
  // Old V14 positions -> new bar-anchored positions.
  const avatarMap: Record<string, AvatarPosition> = {
    above: 'bar-end',
    'bar-end': 'bar-end',
    'beside-label': 'inside-end',
    'after-label': 'inside-end',
    'inside-label': 'inside-start',
    'inside-bar': 'inside-end',
  };
  const remapped = {...DEFAULT_CHART_CONFIG, ...clean};
  if (remapped.avatarPosition !== undefined && remapped.avatarPosition in avatarMap) {
    remapped.avatarPosition = avatarMap[remapped.avatarPosition];
  }
  if (remapped.avatarPosition !== undefined && !validAvatarPositions.includes(remapped.avatarPosition)) {
    remapped.avatarPosition = 'bar-end';
  }
  return remapped;
}
