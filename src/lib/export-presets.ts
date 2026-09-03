export type ExportPresetId =
  | 'vertical'
  | 'horizontal'
  | 'post'
  | 'square'
  | 'custom';

export interface ExportPreset {
  id: ExportPresetId;
  label: string;
  hint: string;
  width: number;
  height: number;
  fps: number;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {id: 'vertical', label: 'Reels / Story', hint: '9:16 vertical', width: 1080, height: 1920, fps: 30},
  {id: 'horizontal', label: 'Horizontal', hint: '16:9', width: 1920, height: 1080, fps: 30},
  {id: 'post', label: 'Post feed', hint: '4:5', width: 1080, height: 1350, fps: 30},
  {id: 'square', label: 'Cuadrado', hint: '1:1', width: 1080, height: 1080, fps: 30},
  {id: 'custom', label: 'Personalizado', hint: 'Elegís el tamaño', width: 1280, height: 720, fps: 30},
];

export const DEFAULT_EXPORT_PRESET: ExportPreset = EXPORT_PRESETS[1];

export function getExportPreset(id: ExportPresetId): ExportPreset {
  return EXPORT_PRESETS.find((p) => p.id === id) ?? DEFAULT_EXPORT_PRESET;
}
