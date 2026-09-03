// Per-template column mapping for animated templates.

// Timeline Race: a date-driven ranked bar race. Each row is one participant /
// event with an optional avatar image, a `dateField` that positions it on the
// shared date axis (a vertical guide sweeps left→right, and when it passes a
// participant's date their accumulated `valueField` jumps up), and a
// `valueField` holding the numeric value shown once activated. If no usable
// date column is found, the template falls back to a simple parallel bar mode
// (ordered by value) so older data keeps rendering.
export type TimelineRaceConfig = {
  labelField?: string;
  imageField?: string;
  dateField?: string;
  valueField?: string;
};

// Keyed by TemplateId. Templates not listed here (or with no entry) inherit
// the static chart's xField/yField mapping until their own config UI lands.
export type AnimationTemplateConfig = {
  'timeline-race'?: TimelineRaceConfig;
};

export function emptyAnimationConfig(): AnimationTemplateConfig {
  return {};
}