// Derivación en TS del modelo de 3 niveles, espejo de la función SQL
// public.viz_config_to_tiers (migración 0178). Se usa en el cliente cuando el
// builder guarda: el payload lleva `config` calculado aquí y la DB lo persiste
// como canónico; los blobs legacy se escriben a la vez desde el mismo store.

import type {ChartConfig} from '@/lib/chart-config';
import {VIZ_CONFIG_VERSION} from './types';
import type {OutputMode, VizConfig} from './types';

// Campos del chart_config que pasan a transversal (el "owner" estático).
// Deben mantenerse sincronizados con la función SQL viz_config_to_tiers.
export const TRANSVERSAL_CHART_KEYS = [
  'title',
  'subtitle',
  'colors',
  'overlays',
  'backgroundType',
  'background',
  'backgroundSecondary',
  'backgroundImage',
  'backgroundPattern',
  'backgroundAngle',
  'backgroundGradientShape',
  'backgroundGradientCenterX',
  'backgroundGradientCenterY',
  'backgroundGradientRadius',
  'backgroundGradientBlend',
  'backgroundGradientSmooth',
  'backgroundOpacity',
  'backgroundBlur',
  'backgroundFit',
] as const;

export type AnimationBlob = {
  outputMode?: OutputMode;
  templateId?: string | null;
  duration?: number | null;
  templateConfig?: Record<string, unknown> | null;
  presetId?: string | null;
  customSize?: {width: number; height: number} | null;
  safeZones?: unknown | null;
};

type Dict = Record<string, unknown>;

function stripNulls(obj: Dict): Dict {
  const out: Dict = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === null || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export function deriveVizConfig(
  chartConfig: Partial<ChartConfig> | null | undefined,
  animationConfig: AnimationBlob | null | undefined,
  outputMode: OutputMode,
): VizConfig {
  const cfg = chartConfig ?? {};
  const ac = animationConfig ?? {};

  // Fondo: el estático (chart_config) es el owner de la base transversal.
  // Los templates conservan su propio fondo como override local en
  // animated.templates (ya viaja ahí dentro de templateConfig).
  const background = stripNulls({
    type: cfg.backgroundType ?? null,
    color: cfg.background ?? null,
    secondary: cfg.backgroundSecondary ?? null,
    image: cfg.backgroundImage ?? null,
    pattern: cfg.backgroundPattern ?? null,
    angle: cfg.backgroundAngle ?? null,
    gradientShape: cfg.backgroundGradientShape ?? null,
    gradientCenterX: cfg.backgroundGradientCenterX ?? null,
    gradientCenterY: cfg.backgroundGradientCenterY ?? null,
    gradientRadius: cfg.backgroundGradientRadius ?? null,
    gradientBlend: cfg.backgroundGradientBlend ?? null,
    gradientSmooth: cfg.backgroundGradientSmooth ?? null,
    opacity: cfg.backgroundOpacity ?? null,
    blur: cfg.backgroundBlur ?? null,
    fit: cfg.backgroundFit ?? null,
  });

  // Export + safe zones vivían en animation_config aunque los estáticos también
  // los usan -> suben a transversal.
  const exportTier = stripNulls({
    presetId: ac.presetId ?? null,
    customSize: ac.customSize ?? null,
  });

  const typography = stripNulls({
    fontFamily: cfg.style?.fontFamily ?? null,
  });

  const transversal = stripNulls({
    title: cfg.title ?? null,
    subtitle: cfg.subtitle ?? null,
    colors: cfg.colors ?? null,
    background,
    overlays: cfg.overlays ?? null,
    typography,
    safeZones: ac.safeZones ?? null,
    export: exportTier,
    configVersion: VIZ_CONFIG_VERSION,
  });

  // Static: chart_config sin los campos que pasan a transversal.
  const staticConfig: Dict = {...(cfg as Dict)};
  for (const key of TRANSVERSAL_CHART_KEYS) delete staticConfig[key];
  if (staticConfig.style instanceof Object && 'fontFamily' in (staticConfig.style as Dict)) {
    const style = {...(staticConfig.style as Dict)};
    delete style.fontFamily;
    if (Object.keys(style).length === 0) delete staticConfig.style;
    else staticConfig.style = style;
  }
  const animated = stripNulls({
    templateId: ac.templateId ?? null,
    common: stripNulls({duration: ac.duration ?? null}),
    templates: ac.templateConfig ?? {},
  });

  return {
    configVersion: VIZ_CONFIG_VERSION,
    transversal,
    static: {config: staticConfig},
    animated,
  };
}