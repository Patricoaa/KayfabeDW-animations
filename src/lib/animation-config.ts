// Per-template column mapping for animated templates.

// Timeline Race: a generic horizontal bar race. Each row is one participant /
// event; `valueField` positions the bar on the shared scale, `startField` /
// `endField` provide the date/position labels, `secondaryField` an optional
// second numeric (e.g. defenses). Fields fall back to the inherited static
// xField/yField mapping (plus heuristic column detection) when unset.
export type TimelineRaceConfig = {
  labelField?: string;
  startField?: string;
  endField?: string;
  valueField?: string;
  secondaryField?: string;
};

// Keyed by TemplateId. Templates not listed here (or with no entry) inherit
// the static chart's xField/yField mapping until their own config UI lands.
export type AnimationTemplateConfig = {
  'timeline-race'?: TimelineRaceConfig;
};

export function emptyAnimationConfig(): AnimationTemplateConfig {
  return {};
}