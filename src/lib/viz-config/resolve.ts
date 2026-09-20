// Resolución de la configuración efectiva para un consumidor dado, aplicando
// la prioridad local > regional > transversal sobre el modelo de 3 niveles.
// Todos los resolvers son puros y tolerantes a configs parciales (la DB y el
// cliente conviven durante la transición, así que nunca se asume un campo).

import type {ChartConfig} from '@/lib/chart-config';
import type {OutputMode, TransversalBackground, VizConfig, VizTransversal} from './types';

export type TemplateOverrideChunk = {
  title?: string | null;
  subtitle?: string | null;
  background?: TransversalBackground;
  overlays?: unknown[] | null;
};

// El template (override local) puede traer título, fondo y overlays propios
// como campos planos dentro de animated.templates[templateId]. Prioridad:
// override local (template) > regional (animated.common) > transversal.
export function resolveTemplateFields(
  config: VizConfig,
  templateId: string | undefined | null,
  fallbackTitle?: string | null,
): TemplateOverrideChunk {
  const t = config.transversal ?? {};
  const templates = config.animated?.templates ?? {};
  const template = (templateId ? templates[templateId] : undefined) as
    | TemplateOverrideChunk
    | undefined;
  const hasOwn = (k: 'title' | 'subtitle' | 'overlays') => template?.[k] !== undefined && template[k] !== null;

  return {
    title: template && hasOwn('title') ? template.title ?? null : (t.title ?? fallbackTitle ?? null),
    subtitle: template && hasOwn('subtitle') ? template.subtitle ?? null : (t.subtitle ?? null),
    background: template?.background ?? t.background ?? {},
    overlays: template && hasOwn('overlays') ? template.overlays ?? null : (t.overlays ?? null),
  };
}

// Funde el nivel transversal back a un chart_config plano, restaurado los
// campos que el estático "hereda" de la base compartida (sin pisar los que el
// chart ya define como override local). Es el inverso de eyección del builder.
export function hydrateChartConfig(
  config: VizConfig | null | undefined,
  chart: Partial<ChartConfig>,
): Partial<ChartConfig> {
  if (!config) return chart;
  const out = {...chart};
  const t = config.transversal ?? {};
  if (t.title !== undefined && out.title === undefined) out.title = t.title ?? '';
  if (t.subtitle !== undefined && out.subtitle === undefined) out.subtitle = t.subtitle ?? '';
  if (t.colors !== undefined && out.colors === undefined) out.colors = t.colors ?? undefined;
  if (t.overlays !== undefined && out.overlays === undefined) {
    out.overlays = (t.overlays ?? undefined) as ChartConfig['overlays'];
  }
  if (t.typography?.fontFamily !== undefined && out.style?.fontFamily === undefined) {
    out.style = {...(out.style ?? {}), fontFamily: t.typography.fontFamily ?? undefined};
  }
  const bg = t.background ?? {};
  const hasBg = bg.type !== undefined;
  if (hasBg && out.backgroundType === undefined) {
    out.backgroundType = (bg.type ?? 'none') as ChartConfig['backgroundType'];
    out.background = bg.color ?? undefined;
    out.backgroundSecondary = bg.secondary ?? undefined;
    out.backgroundImage = bg.image ?? undefined;
    out.backgroundPattern = (bg.pattern ?? undefined) as ChartConfig['backgroundPattern'];
    out.backgroundAngle = bg.angle ?? undefined;
    out.backgroundGradientShape = (bg.gradientShape ?? undefined) as ChartConfig['backgroundGradientShape'];
    out.backgroundGradientCenterX = bg.gradientCenterX ?? undefined;
    out.backgroundGradientCenterY = bg.gradientCenterY ?? undefined;
    out.backgroundGradientRadius = bg.gradientRadius ?? undefined;
    out.backgroundGradientBlend = bg.gradientBlend ?? undefined;
    out.backgroundGradientSmooth = bg.gradientSmooth ?? undefined;
    out.backgroundOpacity = bg.opacity ?? undefined;
    out.backgroundBlur = bg.blur ?? undefined;
    out.backgroundFit = (bg.fit ?? undefined) as ChartConfig['backgroundFit'];
  }
  return out;
}

export function resolveOutputMode(
  config: VizConfig | null | undefined,
  fallback: OutputMode,
): OutputMode {
  if (config && config.animated?.templateId && config.static?.config?.type) return 'animated';
  if (config && config.animated?.templateId) return 'animated';
  if (config && config.static?.config?.type) return 'static';
  return fallback;
}