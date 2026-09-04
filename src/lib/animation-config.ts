// Per-template column mapping for animated templates.

export type DateFormat = 'day' | 'month' | 'year';

export type AvatarShape = 'circle' | 'rounded';
export type AvatarCrop = {zoom?: number; focusX?: number; focusY?: number};

// Timeline Race: a date-driven ranked bar race. Each row is one participant /
// event with an optional avatar image, a `dateField` that positions it on the
// shared date axis (when the playback reaches a participant's date their
// accumulated `valueField` jumps up), and a `valueField` holding the numeric
// value shown once activated. If no usable date column is found, the template
// falls back to a simple parallel bar mode (ordered by value) so older data
// keeps rendering. `dateFormat` controls the axis granularity: day (default,
// one row per exact date), month or year (rows are re-bucketed by period and
// their values re-aggregated).
//
// The participant/avatar column (axe de participante) and the sweeping-time
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
  axisPosition?: 'top' | 'bottom';

  // Avatar controls (mirror the static bar chart): global zoom/focus + shape,
  // overridable per participant via `avatarCrops` (key = participant label).
  avatarSize?: number;
  avatarShape?: AvatarShape;
  avatarRadius?: number;
  avatarZoom?: number;
  avatarFocusX?: number;
  avatarFocusY?: number;
  avatarCrops?: Record<string, AvatarCrop>;

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