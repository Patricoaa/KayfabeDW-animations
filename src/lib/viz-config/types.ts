// Configure uniforme de 3 niveles, espejo TS del modelo persistido en
// `viz_spec.config` (migración 0178). "Espejo" porque la misma forma se
// guarda en Supabase y se deriva aquí idénticamente a `viz_config_to_tiers`:
//
//   transversal : aplica a estático Y animado (title, subtitle, colors,
//                 background unificado incl. 'none', overlays, typography,
//                 safeZones, export) — editable desde ambos modos.
//   static      : { config } — el chart_config menos los campos que pasan a
//                 transversal (regional + local por tipo; hoy solo `bar`).
//   animated    : { templateId, common:{duration}, templates:{por-plantilla} }.
//                 Los overrides por plantilla (title/fondo/overlays propios)
//                 viven DENTRO de templates como override local sobre la base
//                 transversal (prioridad local > regional > transversal).
//
// Durante la transición, chart_config/animation_config se siguen escribiendo
// como espejo legacy junto a `config` (el cliente los deriva del mismo store).

export type OutputMode = 'static' | 'animated';

export const VIZ_CONFIG_VERSION = 1;

export type TransversalBackground = {
  type?: 'none' | 'color' | 'pattern' | 'gradient' | 'image' | null;
  color?: string | null;
  secondary?: string | null;
  image?: string | null;
  pattern?: 'dots' | 'stripes' | 'grid' | 'checkers' | null;
  angle?: number | null;
  gradientShape?: 'linear' | 'radial' | null;
  gradientCenterX?: number | null;
  gradientCenterY?: number | null;
  gradientRadius?: number | null;
  gradientBlend?: number | null;
  gradientSmooth?: number | null;
  opacity?: number | null;
  blur?: number | null;
  fit?: 'cover' | 'contain' | 'fill' | null;
};

export type TransversalExport = {
  presetId?: string | null;
  customSize?: {width: number; height: number} | null;
};

export type VizTransversal = {
  title?: string | null;
  subtitle?: string | null;
  colors?: string[] | null;
  background?: TransversalBackground;
  overlays?: unknown[] | null;
  typography?: {fontFamily?: string | null};
  safeZones?: unknown | null;
  export?: TransversalExport;
  configVersion?: number;
};

export type VizStatic = {
  config: {
    type?: string | null;
    [key: string]: unknown;
  };
};

export type VizAnimated = {
  templateId?: string | null;
  common?: {duration?: number | null};
  templates?: Record<string, unknown>;
};

export type VizConfig = {
  configVersion: number;
  transversal: VizTransversal;
  static: VizStatic;
  animated: VizAnimated;
};