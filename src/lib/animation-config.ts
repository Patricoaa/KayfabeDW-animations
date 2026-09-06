// Per-template column mapping for animated templates.

export type DateFormat = 'day' | 'month' | 'year';

export type AvatarShape = 'circle' | 'rounded';
export type AvatarCrop = {zoom?: number; focusX?: number; focusY?: number};

export type RowSegment = 'bar' | 'avatar';

// Display format for the accumulated value shown next to each bar and on the
// numeric value axis. `hhmmss` interprets the value as a total of seconds.
// Empty = plain locale number (current behavior).
export type ValueFormat = 'number' | 'short' | 'decimal' | 'percent' | 'currency' | 'hhmmss';

// Typography overrides for the title and the on-screen date. Empty = the
// template's default (font family/color/size/weight). `multiline` is only
// used for the title (wrapping of line breaks).
export type RaceTextStyle = {
  fontFamily?: string;
  color?: string;
  size?: number;
  weight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: number;
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';

  // Highlight box behind the text. `highlightColor` enables it (background);
  // `highlightRadius` (px) rounds its corners (0 = square). `underline` adds
  // an underline to the text.
  highlightColor?: string;
  highlightRadius?: number;
  underline?: boolean;
};

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
export type TimelineRaceConfig = {
  labelField?: string;
  imageField?: string;
  dateField?: string;
  valueField?: string;
  dateFormat?: DateFormat;
  title?: string;
  maxRows?: number;

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

  // Title position (px offset from the default top-left placement).
  titleX?: number;
  titleY?: number;

  // Subtitle (optional), rendered under the title. Own text style + position
  // offsets like the title.
  subtitle?: string;
  subtitleText?: RaceTextStyle;
  subtitleX?: number;
  subtitleY?: number;

  // On-screen date position (px offset from the default bottom-right placement).
  dateX?: number;
  dateY?: number;

  // Avatar controls (mirror the static bar chart): shape + per-entity crop
  // overrides via `avatarCrops` (key = entity label). Zoom/focus are
  // per-entity only (no global fallback).
  avatarSize?: number;
  avatarShape?: AvatarShape;
  avatarRadius?: number;
  avatarCrops?: Record<string, AvatarCrop>;

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

  // Canvas background. Can be a solid color, a pattern preset, a gradient, or
  // an uploaded/remote image. `background` is reused as the primary/foreground
  // color depending on the type.
  backgroundType?: 'color' | 'pattern' | 'gradient' | 'image';
  background?: string;            // solid | pattern fg | gradient color 1
  backgroundSecondary?: string;   // gradient color 2
  backgroundImage?: string;       // dataURL / remote URL (image type)
  backgroundPattern?: 'dots' | 'stripes' | 'grid' | 'checkers';
  backgroundAngle?: number;       // gradient/pattern angle (deg)
  backgroundOpacity?: number;     // opacity of the background layer (0-1)
  backgroundBlur?: number;        // blur (px) applied to the background
  backgroundFit?: 'cover' | 'contain' | 'fill'; // how an image is fit

  // Vertical (Y) plot axis: enable a simple axis line at the bars' origin and
  // configure its color and thickness (px).
  showYAxis?: boolean;
  yAxisColor?: string;
  yAxisWidth?: number;

  // Typography overrides for the title and the on-screen date.
  titleText?: RaceTextStyle;
  dateText?: RaceTextStyle;
};

// Keyed by TemplateId. Templates not listed here (or with no entry) inherit
// the static chart's xField/yField mapping until their own config UI lands.
export type AnimationTemplateConfig = {
  'timeline-race'?: TimelineRaceConfig;
};

export function emptyAnimationConfig(): AnimationTemplateConfig {
  return {};
}