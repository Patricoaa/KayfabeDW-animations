// Mapa de ownership de los campos transversal entre los blobs legacy y el
// nivel transversal: define quién es el "dueño" canónico de cada campo y cómo
// viaja desde/hacia chart_config y animation_config, para que la futura
// sección UI compartida escriba una única vez y los espejos legacy sigan
// coherentes durante la transición.
//
// Regla de resolución: local > regional > transversal.

import type {ChartConfig} from '@/lib/chart-config';
import type {AnimationBlob} from './derive';
import type {TransversalBackground, VizTransversal} from './types';

// Campos del chart_config cuyo owner canónico es el nivel transversal
// (coinciden con TRANSVERSAL_CHART_KEYS en derive.ts).
export const CHART_TRANSVERSAL_KEYS = [
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

// Campos del animation_config con owner transversal (export + safe zones).
export const ANIMATION_TRANSVERSAL_KEYS = ['presetId', 'customSize', 'safeZones'] as const;

// Aplica el nivel transversal DE VUELTA a un chart_config, restaurando los
// campos que el estático "hereda" de la base compartida. La usa la carga de
// specs y la futura sección UI común.
export function applyTransversalToChart(
  chart: Partial<ChartConfig>,
  transversal: VizTransversal,
): Partial<ChartConfig> {
  const out: Partial<ChartConfig> = {...chart};
  if (transversal.title !== undefined) out.title = transversal.title ?? '';
  if (transversal.subtitle !== undefined) out.subtitle = transversal.subtitle ?? '';
  if (transversal.colors !== undefined) out.colors = transversal.colors ?? undefined;
  if (transversal.overlays !== undefined) out.overlays = (transversal.overlays ?? undefined) as ChartConfig['overlays'];
  if (transversal.typography?.fontFamily !== undefined) {
    out.style = {...(out.style ?? {}), fontFamily: transversal.typography.fontFamily ?? undefined};
  }
  const bg = transversal.background ?? {};
  applyBackground(out, bg);
  return out;
}

// Aplica el nivel transversal a un animation_config (idéntica semántica).
export function applyTransversalToAnimationBlob(
  ac: AnimationBlob,
  transversal: VizTransversal,
): AnimationBlob {
  const out: AnimationBlob = {...ac};
  if (transversal.export?.presetId !== undefined) out.presetId = transversal.export.presetId;
  if (transversal.export?.customSize !== undefined) out.customSize = transversal.export.customSize;
  if (transversal.safeZones !== undefined) out.safeZones = transversal.safeZones;
  return out;
}

export function applyBackground(target: Partial<ChartConfig>, bg: TransversalBackground) {
  if (bg.type !== undefined) target.backgroundType = (bg.type ?? 'none') as ChartConfig['backgroundType'];
  if (bg.color !== undefined) target.background = bg.color ?? undefined;
  if (bg.secondary !== undefined) target.backgroundSecondary = bg.secondary ?? undefined;
  if (bg.image !== undefined) target.backgroundImage = bg.image ?? undefined;
  if (bg.pattern !== undefined) target.backgroundPattern = (bg.pattern ?? undefined) as ChartConfig['backgroundPattern'];
  if (bg.angle !== undefined) target.backgroundAngle = bg.angle ?? undefined;
  if (bg.gradientShape !== undefined) target.backgroundGradientShape = (bg.gradientShape ?? undefined) as ChartConfig['backgroundGradientShape'];
  if (bg.gradientCenterX !== undefined) target.backgroundGradientCenterX = bg.gradientCenterX ?? undefined;
  if (bg.gradientCenterY !== undefined) target.backgroundGradientCenterY = bg.gradientCenterY ?? undefined;
  if (bg.gradientRadius !== undefined) target.backgroundGradientRadius = bg.gradientRadius ?? undefined;
  if (bg.gradientBlend !== undefined) target.backgroundGradientBlend = bg.gradientBlend ?? undefined;
  if (bg.gradientSmooth !== undefined) target.backgroundGradientSmooth = bg.gradientSmooth ?? undefined;
  if (bg.opacity !== undefined) target.backgroundOpacity = bg.opacity ?? undefined;
  if (bg.blur !== undefined) target.backgroundBlur = bg.blur ?? undefined;
  if (bg.fit !== undefined) target.backgroundFit = (bg.fit ?? undefined) as ChartConfig['backgroundFit'];
}

// Aplica el nivel transversal al config de UN template animado (header + lienzo),
// respetando la prioridad local > transversal: un campo del template solo se pisa
// cuando aún "hereda" (está indefinido o sigue igualando la base transversal previa).
// Subtítulo y fondo no tienen fallback en los renderers animados, por eso la
// sección UI común debe materializarlos en el template cuando no hay override.
export function applyTransversalToTemplate<T extends object>(
  template: T | undefined,
  transversal: VizTransversal,
  prev?: VizTransversal,
): T {
  const out: Record<string, unknown> = {...(template ?? {})};

  const inherited = (cur: unknown, prevVal: unknown) =>
    cur === undefined || (prevVal !== undefined && cur === prevVal);

  if (transversal.title !== undefined && inherited(out.title, prev?.title ?? undefined)) {
    out.title = transversal.title ?? undefined;
  }
  if (transversal.subtitle !== undefined && inherited(out.subtitle, prev?.subtitle ?? undefined)) {
    out.subtitle = transversal.subtitle ?? undefined;
  }

  const bg = transversal.background;
  if (
    bg &&
    bg.type !== undefined &&
    bg.type !== 'none' &&
    inherited(out.backgroundType, prev?.background?.type ?? undefined)
  ) {
    applyBackground(out as Partial<ChartConfig>, bg);
  }
  return out as T;
}

// Extrae el nivel transversal desde chart_config (el owner de la base estática).
export function extractTransversalFromChart(chart: Partial<ChartConfig>): VizTransversal {
  const bg: TransversalBackground = {};
  if (chart.backgroundType !== undefined) bg.type = chart.backgroundType;
  if (chart.background !== undefined) bg.color = chart.background;
  if (chart.backgroundSecondary !== undefined) bg.secondary = chart.backgroundSecondary;
  if (chart.backgroundImage !== undefined) bg.image = chart.backgroundImage;
  if (chart.backgroundPattern !== undefined) bg.pattern = chart.backgroundPattern;
  if (chart.backgroundAngle !== undefined) bg.angle = chart.backgroundAngle;
  if (chart.backgroundGradientShape !== undefined) bg.gradientShape = chart.backgroundGradientShape;
  if (chart.backgroundGradientCenterX !== undefined) bg.gradientCenterX = chart.backgroundGradientCenterX;
  if (chart.backgroundGradientCenterY !== undefined) bg.gradientCenterY = chart.backgroundGradientCenterY;
  if (chart.backgroundGradientRadius !== undefined) bg.gradientRadius = chart.backgroundGradientRadius;
  if (chart.backgroundGradientBlend !== undefined) bg.gradientBlend = chart.backgroundGradientBlend;
  if (chart.backgroundGradientSmooth !== undefined) bg.gradientSmooth = chart.backgroundGradientSmooth;
  if (chart.backgroundOpacity !== undefined) bg.opacity = chart.backgroundOpacity;
  if (chart.backgroundBlur !== undefined) bg.blur = chart.backgroundBlur;
  if (chart.backgroundFit !== undefined) bg.fit = chart.backgroundFit;

  const transversal: VizTransversal = {
    title: chart.title ?? null,
    subtitle: chart.subtitle ?? null,
    colors: chart.colors ?? null,
    overlays: chart.overlays ?? null,
    background: Object.keys(bg).length > 0 ? bg : undefined,
    typography: chart.style?.fontFamily !== undefined ? {fontFamily: chart.style.fontFamily} : undefined,
  };
  return transversal;
}