import {describe, expect, it} from 'vitest';
import {deriveVizConfig, TRANSVERSAL_CHART_KEYS} from '@/lib/viz-config/derive';
import {applyTransversalToChart, extractTransversalFromChart, applyBackground, applyTransversalToTemplate} from '@/lib/viz-config/fields';
import {hydrateChartConfig, resolveOutputMode, resolveTemplateFields} from '@/lib/viz-config/resolve';
import {VIZ_CONFIG_VERSION} from '@/lib/viz-config/types';
import {DEFAULT_CHART_CONFIG} from '@/lib/chart-config';

describe('deriveVizConfig (espejo TS de viz_config_to_tiers)', () => {
  it('mueve title/subtitle/colors/background/overlays a transversal y los quita de static', () => {
    const chart = {
      ...DEFAULT_CHART_CONFIG,
      title: 'T',
      subtitle: 'S',
      colors: ['#111111'],
      backgroundType: 'gradient' as const,
      background: '#222222',
      backgroundSecondary: '#333333',
      overlays: [{id: 'o1', type: 'text' as const, text: 'x'}],
      style: {fontFamily: 'var(--font-inter)'},
      xField: 'name',
      yField: 'wins',
    };
    const cfg = deriveVizConfig(chart, {presetId: 'square', safeZones: {m: 10}, templateId: 'ranking', duration: 12, templateConfig: {ranking: {}}}, 'animated');

    expect(cfg.configVersion).toBe(VIZ_CONFIG_VERSION);
    expect(cfg.transversal.title).toBe('T');
    expect(cfg.transversal.subtitle).toBe('S');
    expect(cfg.transversal.colors).toEqual(['#111111']);
    expect(cfg.transversal.background).toMatchObject({
      type: 'gradient',
      color: '#222222',
      secondary: '#333333',
    });
    expect(cfg.transversal.overlays).toHaveLength(1);
    expect(cfg.transversal.typography?.fontFamily).toBe('var(--font-inter)');
    expect(cfg.transversal.export?.presetId).toBe('square');
    expect(cfg.transversal.safeZones).toEqual({m: 10});

    // static.config conserva los campos regionales/locales del chart
    expect(cfg.static.config.type).toBe('bar');
    expect(cfg.static.config.xField).toBe('name');
    expect(cfg.static.config.yField).toBe('wins');
    for (const key of TRANSVERSAL_CHART_KEYS) {
      expect(cfg.static.config).not.toHaveProperty(key);
    }
    expect((cfg.static.config.style as Record<string, unknown> | undefined)).toBeUndefined();

    expect(cfg.animated.templateId).toBe('ranking');
    expect(cfg.animated.common?.duration).toBe(12);
    expect(cfg.animated.templates).toEqual({ranking: {}});
  });

  it('mantiene campos sin valor fuera de transversal (equivalente a jsonb_strip_nulls)', () => {
    const cfg = deriveVizConfig({...DEFAULT_CHART_CONFIG, title: '', colors: ['#111111']}, {}, 'static');
    // title vacío SÍ se conserva (string no nula); background vacío se colapsa
    expect(cfg.transversal.title).toBe('');
    expect(cfg.transversal.background).toMatchObject({type: 'none'});
    // animated vacío: templateId ausente, common y templates presentes
    expect(cfg.animated.templateId).toBeUndefined();
    expect(cfg.animated.common).toEqual({});
    expect(cfg.animated.templates).toEqual({});
  });

  it('tolera nulables (chart_config {} y animation_config ausente)', () => {
    const cfg = deriveVizConfig(null, null, 'static');
    // stripNulls equivale a jsonb_strip_nulls: los nulos se DROP (undefined = ausente)
    expect(cfg.transversal.title).toBeUndefined();
    expect(cfg.transversal.colors).toBeUndefined();
    expect(cfg.animated.templateId).toBeUndefined();
    expect(cfg.animated.common).toEqual({});
    expect(cfg.static.config.type).toBeUndefined();
  });
});

describe('applyTransversalToChart / extractTransversalFromChart', () => {
  it('restaura campos transversales sobre un chart parcial (round-trip)', () => {
    const chart = {
      ...DEFAULT_CHART_CONFIG,
      title: 'T',
      backgroundType: 'gradient' as const,
      background: '#222222',
      backgroundSecondary: '#333333',
      style: {fontFamily: 'var(--font-inter)'},
      xField: 'name',
    };
    const cfg = deriveVizConfig(chart, {}, 'static');
    const restored = applyTransversalToChart(cfg.static.config as never, cfg.transversal);
    expect(restored.title).toBe('T');
    expect(restored.xField).toBe('name');
    expect(restored.backgroundType).toBe('gradient');
    expect(restored.background).toBe('#222222');
    expect(restored.backgroundSecondary).toBe('#333333');
    expect(restored.style?.fontFamily).toBe('var(--font-inter)');

    const extracted = extractTransversalFromChart(chart);
    expect(extracted.title).toBe('T');
    expect(extracted.background?.color).toBe('#222222');
  });

  it('applyBackground solo pisa los campos definidos', () => {
    const target: Record<string, string> = {};
    applyBackground(target, {type: 'color', color: '#fff'});
    expect(target.backgroundType).toBe('color');
    expect(target.background).toBe('#fff');
    expect(target).not.toHaveProperty('backgroundBlur');
  });
});

describe('applyTransversalToTemplate', () => {
  type Template = {title?: string; subtitle?: string; backgroundType?: string; background?: string};
  const transversal = {
    title: 'Común',
    subtitle: 'Sub común',
    typography: {fontFamily: 'var(--font-inter)'},
    background: {type: 'color' as const, color: '#0a0a0a'},
  };

  it('escribe campos presentativos en un template vacío', () => {
    const out = applyTransversalToTemplate<Template>(undefined, transversal);
    expect(out.title).toBe('Común');
    expect(out.subtitle).toBe('Sub común');
    expect(out.backgroundType).toBe('color');
    expect(out.background).toBe('#0a0a0a');
  });

  it('respeta un override local que difiere del valor transversal previo', () => {
    const template: Template = {title: 'Override local'};
    const out = applyTransversalToTemplate<Template>(template, transversal, {title: 'Anterior común'});
    expect(out.title).toBe('Override local');
  });

  it('actualiza un valor heredado cuando coincide con el transversal previo', () => {
    const template: Template = {title: 'Anterior común'};
    const out = applyTransversalToTemplate<Template>(template, transversal, {title: 'Anterior común'});
    expect(out.title).toBe('Común');
  });

  it('no pisa un override local de subtítulo', () => {
    const out = applyTransversalToTemplate<Template>({subtitle: 'Local'}, transversal, {subtitle: 'Anterior'});
    expect(out.subtitle).toBe('Local');
  });

  it('omite el bloque de fondo si el tipo transversal es none', () => {
    const out = applyTransversalToTemplate<Template>(undefined, {
      ...transversal,
      background: {type: 'none' as const},
    });
    expect(out).not.toHaveProperty('backgroundType');
    expect(out).not.toHaveProperty('background');
  });

  it('respeta un backgroundType local definido', () => {
    const template: Template = {backgroundType: 'pattern', background: '#222222'};
    const out = applyTransversalToTemplate<Template>(template, transversal, {
      background: {type: 'gradient' as const, color: '#000000'},
    });
    expect(out.backgroundType).toBe('pattern');
    expect(out.background).toBe('#222222');
  });
});

describe('hydration y resolución', () => {
  it('hydrateChartConfig no pisa overrides locales del chart', () => {
    const cfg = deriveVizConfig(
      {...DEFAULT_CHART_CONFIG, title: 'Base', backgroundType: 'color' as const, background: '#111111'},
      {},
      'static',
    );
    const out = hydrateChartConfig(cfg, {title: 'Local', xField: 'x'});
    expect(out.title).toBe('Local');
    expect(out.backgroundType).toBe('color');
    expect(out.background).toBe('#111111');
    expect(out.xField).toBe('x');
  });

  it('resolveOutputMode lee config antes del fallback', () => {
    const cfg = deriveVizConfig({...DEFAULT_CHART_CONFIG}, {templateId: 'ranking', duration: 10}, 'animated');
    expect(resolveOutputMode(cfg, 'static')).toBe('animated');
    expect(resolveOutputMode({...cfg, animated: {common: {}}}, 'static')).toBe('static');
  });

  it('resolveTemplateFields aplica override local (template) sobre transversal', () => {
    const config = {
      configVersion: 1,
      transversal: {title: 'Base', subtitle: 'Sub base'},
      static: {config: {type: 'bar'}},
      animated: {
        templateId: 'ranking',
        common: {duration: 10},
        templates: {
          ranking: {title: 'Override'},
        },
      },
    };
    const resolved = resolveTemplateFields(config, 'ranking');
    expect(resolved.title).toBe('Override');
    expect(resolved.subtitle).toBe('Sub base');
  });
});