// Per-template column mapping for animated templates.

export type DateFormat = 'day' | 'month' | 'year';

export type AvatarShape = 'circle' | 'rounded';
export type AvatarCrop = {zoom?: number; focusX?: number; focusY?: number};

export type RowSegment = 'bar' | 'value' | 'avatar';

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
  showDateLabel?: boolean;
  showXAxis?: boolean;
  axisPosition?: 'top' | 'bottom';

  // Left→right arrangement of the three row segments, e.g. ['bar','value','avatar'].
  rowOrder?: ('bar' | 'value' | 'avatar')[];

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

  // Canvas: background color + content margins (RRSS "safe" zones).
  background?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
};

// Keyed by TemplateId. Templates not listed here (or with no entry) inherit
// the static chart's xField/yField mapping until their own config UI lands.
export type AnimationTemplateConfig = {
  'timeline-race'?: TimelineRaceConfig;
};

export function emptyAnimationConfig(): AnimationTemplateConfig {
  return {};
}