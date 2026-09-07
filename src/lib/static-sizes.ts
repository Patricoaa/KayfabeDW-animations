export type StaticSizeId = 'story' | 'post' | 'post45' | 'custom';

export interface StaticSizePreset {
  id: Exclude<StaticSizeId, 'custom'>;
  label: string;
  hint: string;
  width: number;
  height: number;
}

// Target canvas sizes for static chart visualizations. Selecting one resizes
// the chart SVG (viewBox) so a 1x PNG/JPG export lands at exactly those pixels.
export const STATIC_SIZE_PRESETS: StaticSizePreset[] = [
  {id: 'story', label: 'Shorts / Reels / TikTok', hint: '9:16 vertical', width: 1080, height: 1920},
  {id: 'post', label: 'Publicaciones', hint: '3:4', width: 1080, height: 1440},
  {id: 'post45', label: 'Publicaciones 4:5', hint: '4:5', width: 1080, height: 1350},
];

export function getStaticSizePreset(id: StaticSizeId) {
  return STATIC_SIZE_PRESETS.find((p) => p.id === id);
}

// Returns the preset id matching the given canvas size, or 'custom'.
export function staticSizeKey(width: number, height: number): StaticSizeId {
  const hit = STATIC_SIZE_PRESETS.find((p) => p.width === width && p.height === height);
  return hit ? hit.id : 'custom';
}