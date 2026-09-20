// Modelo de configuración uniforme de 3 niveles (transversal/static/animated).
// Es espejo TS de `viz_spec.config` persistida (migración 0178): el builder
// deriva `config` con deriveVizConfig al guardar, y los consumidores la leen
// vía los resolvers (prioridad local > regional > transversal).

export type {
  OutputMode,
  TransversalBackground,
  TransversalExport,
  VizAnimated,
  VizConfig,
  VizStatic,
  VizTransversal,
} from './types';

export {
  deriveVizConfig,
  TRANSVERSAL_CHART_KEYS,
} from './derive';
export type {AnimationBlob} from './derive';

export {
  ANIMATION_TRANSVERSAL_KEYS,
  CHART_TRANSVERSAL_KEYS,
  applyBackground,
  applyTransversalToAnimationBlob,
  applyTransversalToChart,
  extractTransversalFromChart,
} from './fields';

export {
  hydrateChartConfig,
  resolveOutputMode,
  resolveTemplateFields,
} from './resolve';
export type {TemplateOverrideChunk} from './resolve';

export {VIZ_CONFIG_VERSION} from './types';