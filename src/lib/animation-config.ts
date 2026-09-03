// Per-template column mapping for animated templates.

export type DateFormat = 'day' | 'month' | 'year';

// Timeline Race: a date-driven ranked bar race. Each row is one participant /
// event with an optional avatar image, a `dateField` that positions it on the
// shared date axis (a vertical guide sweeps left→right, and when it passes a
// participant's date their accumulated `valueField` jumps up), and a
// `valueField` holding the numeric value shown once activated. If no usable
// date column is found, the template falls back to a simple parallel bar mode
// (ordered by value) so older data keeps rendering. `dateFormat` controls the
// axis granularity: day (default, one row per exact date), month or year
// (rows are re-bucketed by period and their values re-aggregated).
export type TimelineRaceConfig = {
  labelField?: string;
  imageField?: string;
  dateField?: string;
  valueField?: string;
  dateFormat?: DateFormat;
};

// Keyed by TemplateId. Templates not listed here (or with no entry) inherit
// the static chart's xField/yField mapping until their own config UI lands.
export type AnimationTemplateConfig = {
  'timeline-race'?: TimelineRaceConfig;
};

export function emptyAnimationConfig(): AnimationTemplateConfig {
  return {};
}