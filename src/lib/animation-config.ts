// Per-template column mapping for animated templates.

import type {TextStyle} from './chart-config';

export type DateFormat = 'day' | 'month' | 'year';

export type AvatarShape = 'circle' | 'rounded';
export type AvatarCrop = {zoom?: number; focusX?: number; focusY?: number};

export type RowSegment = 'bar' | 'avatar';

// Display format for the accumulated value shown next to each bar and on the
// numeric value axis. `hhmmss` interprets the value as a total of seconds.
// Empty = plain locale number (current behavior).
export type ValueFormat = 'number' | 'short' | 'decimal' | 'percent' | 'currency' | 'hhmmss';

// Unified number-format list for the animated templates (canonical labels,
// mirrored with the static chart's NUMBER_FORMATS in chart-config.ts).
export const VALUE_FORMATS: {value: ValueFormat; label: string}[] = [
  {value: 'number', label: 'Número (1.234)'},
  {value: 'short', label: 'Compacto (1,2k)'},
  {value: 'decimal', label: 'Decimal (1,23)'},
  {value: 'percent', label: 'Porcentaje (%)'},
  {value: 'currency', label: 'Moneda ($1.234)'},
  {value: 'hhmmss', label: 'Duración (hh:mm:ss)'},
];

// Typography overrides for the title, date, row labels, etc. Empty = the
// template's default (font family/color/size/weight). `multiline` is only
// used for the title (wrapping of line breaks). Alias of the shared TextStyle.
export type RaceTextStyle = TextStyle;

// Shared crop math: how a zoomed (and focus-shifted) image is placed inside a
// square frame of `size` px. Used by BOTH the config-panel sidebar preview and
// the Remotion `<Avatar>` render so they always agree.
export function avatarCropRect(zoom = 1, focusX = 0, focusY = 0, size: number) {
  const z = Math.max(zoom, 0.1);
  const fx = Math.max(Math.min(focusX, 1), -1);
  const fy = Math.max(Math.min(focusY, 1), -1);
  const w = size * z;
  const h = size * z;
  const extra = w - size;
  return {w, h, dx: fx * extra / 2, dy: fy * extra / 2};
}

// ---- Shared animation config (reused by every template) ----

// Header block: title + subtitle with per-text style and position offsets.
// Empty fields fall back to each template's default layout.
export type CommonHeaderConfig = {
  title?: string;
  titleX?: number;
  titleY?: number;
  titleText?: RaceTextStyle;
  subtitle?: string;
  subtitleText?: RaceTextStyle;
  subtitleX?: number;
  subtitleY?: number;
};

// Canvas background: solid color, pattern preset, gradient or image.
// `background` is reused as the primary/foreground color depending on type.
export type CommonCanvasConfig = {
  backgroundType?: 'color' | 'pattern' | 'gradient' | 'image';
  background?: string;            // solid | pattern fg | gradient color 1
  backgroundSecondary?: string;   // gradient color 2
  backgroundImage?: string;       // dataURL / remote URL (image type)
  backgroundPattern?: 'dots' | 'stripes' | 'grid' | 'checkers';
  backgroundAngle?: number;       // gradient/pattern angle (deg)
  backgroundGradientShape?: 'linear' | 'radial'; // gradient geometry
  backgroundGradientCenterX?: number; // radial center X (% of canvas width)
  backgroundGradientCenterY?: number; // radial center Y (% of canvas height)
  backgroundGradientRadius?: number;  // radial reach (% of the shorter side)
  backgroundGradientBlend?: number;   // gradient intensity (0-1): how much the final
                                      // color dominates (0 = blended toward the initial)
  backgroundGradientSmooth?: number;  // transition softness (0-1): width of the fade
  backgroundOpacity?: number;     // opacity of the background layer (0-1)
  backgroundBlur?: number;        // blur (px) applied to the background
  backgroundFit?: 'cover' | 'contain' | 'fill'; // how an image is fit
  backgroundAnim?: 'none' | 'mirror'; // image-only background animation
  backgroundAnimSpeed?: number;       // mirror loop: frames per 180° flip
};

// Everything a template inherits from the shared config. Kept flat on purpose
// so specs saved with older configs (flat fields) keep loading unchanged.
export type CommonAnimationConfig = CommonHeaderConfig & CommonCanvasConfig & {
  overlays?: import('./chart-config').ChartOverlay[];
};

// Timeline Race: a date-driven ranked bar race. Each row is one entity /
// event with an optional avatar image, a `dateField` that positions it on the
// shared date axis (when the playback reaches an entity's date their
// accumulated `valueField` jumps up), and a `valueField` holding the numeric
// value shown once activated. If no usable date column is found, the template
// falls back to a simple parallel bar mode (ordered by value) so older data
// keeps rendering. `dateFormat` controls the axis granularity: day (default,
// one row per exact date), month or year (rows are re-bucketed by period and
// their values re-aggregated).
//
// The entity/avatar column (axe de entidad) and the sweeping-time
// drive are always active, so there are no show/hide toggles for them. The
// bottom "x axis" shows the numeric min/max of the accumulated value (0 →
// maxValue), not dates. The on-screen big date (bottom-right) is independent.
export type TimelineRaceConfig = CommonAnimationConfig & {
  labelField?: string;
  imageField?: string;
  dateField?: string;
  valueField?: string;
  dateFormat?: DateFormat;
  maxRows?: number;

  // Aggregation applied when multiple rows fall in the same date period for
  // the same entity. 'sum' (default) adds them up; 'count' counts rows;
  // 'avg' averages; 'min'/'max' pick the extreme; 'last' takes the last value.
  valueAgg?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'last';

  // Controls how the period values are accumulated over time.
  // 'running' (default): each step adds to a running total (classic bar race).
  // 'period': each step shows only the value for that period (no cumulation).
  accumulateMode?: 'running' | 'period';

  // Pause (seconds) that freezes the final result on-screen after the sweep
  // finishes and before the outro contracts the bars. 0 = no extra hold.
  holdFinalSeconds?: number;

  // Duration (seconds) of the race sweep itself (the sliding guide traveling
  // across the date axis). Empty/0 = automatic: the race stretches across all
  // the time left after the ease-in, hold and outro. When pinned to a value,
  // the race finishes exactly at that duration and any leftover time is kept
  // frozen on the final result (in addition to `holdFinalSeconds`).
  raceDurationSeconds?: number;

  // Podium effect at the race end: when the winner is revealed, the leader
  // grows + glows and the rest are dimmed. false disables the whole effect
  // (no dimming, no scale/glow). Defaults to ON.
  podiumEffect?: boolean;

  // Show the rail/groove under each bar (the "track" the bar slides along).
  // false renders only the bars.
  showRail?: boolean;

  // Bar-group position (px offset from the default center placement). Moves
  // the whole row block (avatars + bars + track + accumulated value), the
  // numeric X axis and the Y axis together.
  barsX?: number;
  barsY?: number;
  showDateLabel?: boolean;
  showXAxis?: boolean;
  axisPosition?: 'top' | 'bottom';

  // Left→right arrangement of the row segments, e.g. ['avatar','bar']. The
  // value (dato) is no longer here: it is pinned to the bar's right end.
  rowOrder?: ('bar' | 'avatar')[];

  // Row spacing (px). `rowGapH` = horizontal separation between the three row
  // segments; `rowGap` = vertical separation between rows. Empty = auto.
  rowGapH?: number;
  rowGap?: number;

  // Bar width as a fraction of the row width (0.4-0.9, default 0.75). Making it
  // smaller gives the value/avatar columns more room so the value stays visible.
  barWidth?: number;

  // On-screen date position (px offset from the default bottom-right placement).
  dateX?: number;
  dateY?: number;

  // Avatar controls (mirror the static bar chart): shape + per-entity crop
  // overrides via `avatarCrops` (key = entity label). Zoom/focus are
  // per-entity only (no global fallback). `showAvatar` hides all avatars.
  showAvatar?: boolean;
  avatarSize?: number;
  avatarShape?: AvatarShape;
  avatarRadius?: number;
  avatarCrops?: Record<string, AvatarCrop>;
  avatarBg?: string;
  avatarBorderColor?: string;
  avatarBorderWidth?: number;

  // Per-entity bar colors (label -> color), mirroring the static chart's
  // `colorOverrides`. Empty value = default color.
  barColors?: Record<string, string>;

  // Bar corner radius (px). Empty = full pill.
  barRadius?: number;

  // Color palette cycled across entities (by entity order). Per-entity
  // `barColors` overrides win over the palette; without a palette the leader
  // uses the accent color and the rest default gray.
  barPalette?: string[];

  // Bar/groove thickness override (px). Empty = automatic (42% of row height).
  barThickness?: number;

  // Display format for the accumulated value (bar rows + numeric axis).
  // Default `number` keeps the current locale formatting.
  valueFormat?: ValueFormat;
  currencySymbol?: string;

  // Vertical (Y) plot axis: enable a simple axis line at the bars' origin and
  // configure its color and thickness (px).
  showYAxis?: boolean;
  yAxisColor?: string;
  yAxisWidth?: number;

  // Typography overrides for the on-screen date.
  dateText?: RaceTextStyle;

  // Typography overrides for the entity label (parked on the contracted bar
  // during the outro) and for the datum that travels inside each bar.
  labelText?: RaceTextStyle;
  valueText?: RaceTextStyle;
};

// The movable elements of a ranking row. During entry each one travels along a
// straight cardinal path; per-element direction/delay overrides are keyed by
// these ids ('bar' is the bar in bars mode and the label in table mode).
export type RowEntryElement = 'rank' | 'avatar' | 'bar' | 'value';

// Ranking: counters that drop in one by one, ordered best → worst (or the
// reverse via `revealDirection`). Each entity (`labelField`) has a numeric
// `valueField`; an optional `imageField` shows an avatar. `maxRows` trims how
// many entities participate.
export type RankingConfig = CommonAnimationConfig & {
  labelField?: string;
  valueField?: string;
  imageField?: string;

  // How the value is computed when the dataset has several rows per entity
  // (rows grouped by labelField). 'none' (default) keeps one ranking entry per
  // data row. 'weightedAvg' uses `weightField` as the per-row weight.
  valueAgg?: 'none' | 'sum' | 'count' | 'countDistinct' | 'avg' | 'weightedAvg' | 'min' | 'max';
  weightField?: string;

  // Cap on how many rows are animated (top-N by value, kept in the reveal
  // order). Empty = no cap.
  maxRows?: number;

  // Reveal order: 'desc' (default) counts down from last place to #1, 'asc'
  // builds up 1st → last.
  revealDirection?: 'asc' | 'desc';

  // Animate each datum counting up to its real value. Defaults to ON.
  countUp?: boolean;

  // Duration (seconds) of the whole reveal sweep (all rows dropping in).
  // Empty = auto (stretches across the available duration minus holds).
  countUpDurationSeconds?: number;

  // Pause (seconds) frozen on the final ranking before the video ends.
  holdFinalSeconds?: number;

  // Show the rank number ("#1", ...) on each row and the raw value next to it.
  showRank?: boolean;
  showValue?: boolean;

  // Display mode: 'bars' (default, animated bars) or 'table' (minimalist table
  // with horizontal separators only; count-up, drop-in and the per-position
  // image frame still apply).
  rankMode?: 'bars' | 'table';

  // Whether per-entity avatars render (default ON). When OFF no avatar is drawn
  // and no width is reserved for it.
  showAvatar?: boolean;

  // Row entry animation (both modes): the side each element of the row (rank,
  // avatar, bar/label, datum) travels from, along a straight cardinal path.
  // 'together' (default) makes every element use the same general direction;
  // 'custom' lets each element pick its own direction (`rowEntryDirs`) and its
  // own sequential delay in frames (`rowEntryDelays`). Elements without an
  // override fall back to the general direction.
  rowEntryDir?: 'left' | 'right' | 'top' | 'bottom';
  rowEntryMode?: 'together' | 'custom';
  rowEntryDirs?: Partial<Record<RowEntryElement, 'left' | 'right' | 'top' | 'bottom'>>;
  rowEntryDelays?: Partial<Record<RowEntryElement, number>>;

  // Table-mode row separators (horizontal rule under each row): thickness (px)
  // and color. Bars mode has no separators.
  tableSepWidth?: number;
  tableSepColor?: string;

  // Prefix for the rank number (e.g. "#"), empty = no prefix.
  rankPrefix?: string;

  // Color of the row cursor/highlight when a row drops in.
  accentColor?: string;

  // Per-entity avatar crop overrides (key = entity label or image).
  avatarCrops?: Record<string, AvatarCrop>;

  // Avatar look (mirrors the timeline race / static bar chart).
  avatarSize?: number;
  avatarShape?: AvatarShape;
  avatarRadius?: number;
  avatarBg?: string;
  avatarBorderColor?: string;
  avatarBorderWidth?: number;

  // Per-entity row color overrides (label -> color).
  rowColors?: Record<string, string>;

  // Large per-position image (key = entity label). Manual entry: a remote URL or
  // an uploaded dataURL. When any image is set, a global frame appears on the
  // right side of the canvas: the ranking rows squeeze to the left and the
  // frame shows the image of the position being revealed (crossfade between
  // positions + a slow one-way left→right pan over the reveal window).
  rowImages?: Record<string, string>;
  rowImageCrops?: Record<string, AvatarCrop>;

  // Per-entity image source mode for the frame. 'entity' uses the entity's
  // image field (the avatar source, falling back to `rowImages`); 'url'/'file'
  // use the manually entered `rowImages` value.
  rowImageModes?: Record<string, 'entity' | 'url' | 'file'>;

  // Optional "puesto" label overlaid on the frame image (global): show/hide,
  // offset inside the frame and its own text style. Content = rankPrefix +
  // position.
  rowImageLabel?: boolean;
  rowImageLabelX?: number;
  rowImageLabelY?: number;
  rowImageLabelText?: RaceTextStyle;

  // Global frame (right side of the canvas). `rowImageWidth` is the frame width
  // in px (empty = auto, right side; no upper cap, can reach the full canvas
  // width — rows squeeze left); `rowImageHeight` empty = full height of the
  // rows area. `rowImageX`/`rowImageY` offset the frame on the canvas.
  // Each image auto-fills the frame (`object-fit: cover`), and per-entity
  // `rowImageCrops` zoom/focus adjust the crop inside it.
  rowImageWidth?: number;
  rowImageHeight?: number;
  rowImageX?: number;
  rowImageY?: number;

  // Enable the one-way left→right pan that accompanies each reveal (default ON).
  rowImagePan?: boolean;

  // Per-position pan direction override for the frame image: 'ltr' (default,
  // left→right) or 'rtl' (right→left). The global `rowImagePan` toggle stays
  // the master switch.
  rowImagePanDirs?: Record<string, 'ltr' | 'rtl'>;

  // Frame backdrop behind the per-position image. `'canvas'` (default) makes
  // the frame transparent so the canvas background shows through where the
  // image is transparent (logos/cutouts); `'dark'` uses a flat dark panel.
  rowImageFrameBg?: 'canvas' | 'dark';

  // Row spacing (px vertical gap between rows) and horizontal gap (px)
  // between row segments (rank, avatar, bar).
  rowGap?: number;
  rowGapH?: number;

  // Display format for the value shown on each row. Default `number` keeps
  // the current locale formatting. `currencySymbol` is prepended when `currency`.
  valueFormat?: ValueFormat;
  currencySymbol?: string;

  // Bar width as a multiplier of the automatic track width (1 = as today).
  barWidth?: number;

  // Show a rail/placeholder track behind each row while waiting.
  showRail?: boolean;

  // Horizontal position of the rows block (px offset).
  rowsX?: number;
  rowsY?: number;

  // Typography overrides.
  rankText?: RaceTextStyle;
  valueText?: RaceTextStyle;
  labelText?: RaceTextStyle;
};

// Keyed by TemplateId. Templates not listed here (or with no entry) inherit
// the static chart's xField/yField mapping until their own config UI lands.
export type AnimationTemplateConfig = {
  'timeline-race'?: TimelineRaceConfig;
  'ranking'?: RankingConfig;
};

export function emptyAnimationConfig(): AnimationTemplateConfig {
  return {};
}