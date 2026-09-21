import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';

import {applyChartDefaults} from '@/lib/chart-config';
import {ChartPreview} from '@/components/charts/chart-preview';

function cfg(type: 'bar' | 'pie' | 'faceoff', overrides: Record<string, unknown> = {}) {
  return applyChartDefaults({type, ...overrides});
}

const rows: Record<string, unknown>[] = [{cat: 'A', valor: 3, entidad: 'Rey'}];

function render(c: ReturnType<typeof cfg>, data: Record<string, unknown>[] = rows) {
  return renderToStaticMarkup(<ChartPreview data={data} config={c} />);
}

describe('ChartPreview guard de mapeo', () => {
  it('muestra guía en bar cuando no hay Eje X asignado', () => {
    const html = render(cfg('bar'));
    expect(html).toContain('Tus datos están listos');
    expect(html).toContain('Eje X / Categoría');
  });

  it('muestra guía cuando el Eje X ya no existe en las filas', () => {
    const html = render(cfg('bar', {xField: 'inexistente'}));
    expect(html).toContain('Tus datos están listos');
  });

  it('renderiza barras cuando xField está asignado', () => {
    const html = render(cfg('bar', {xField: 'cat', yField: 'valor'}));
    expect(html).toContain('<svg');
    expect(html).not.toContain('Tus datos están listos');
  });

  it('guía cuando la categoría tiene demasiados valores distintos', () => {
    const big: Record<string, unknown>[] = Array.from({length: 300}, (_, i) => ({cat: `c${i}`, valor: i}));
    const html = render(cfg('bar', {xField: 'cat', yField: 'valor'}), big);
    expect(html).toContain('Demasiadas categorías');
    expect(html).toContain('300');
    expect(html).not.toContain('<svg');
  });

  it('prueba sin marcas de subpíxel: cardinalidad justa por debajo del tope renderiza', () => {
    const small: Record<string, unknown>[] = Array.from({length: 150}, (_, i) => ({cat: `c${i}`, valor: i}));
    const html = render(cfg('bar', {xField: 'cat', yField: 'valor'}), small);
    expect(html).toContain('<svg');
    expect(html).not.toContain('Demasiadas categorías');
  });

  it('muestra guía en pie sin xField', () => {
    const html = render(cfg('pie'));
    expect(html).toContain('Tus datos están listos');
  });

  it('muestra guía en faceoff sin campo de entidad', () => {
    const html = render(cfg('faceoff', {faceIconField: 'icono', faceValueField: 'valor'}));
    expect(html).toContain('Tus datos están listos');
    expect(html).toContain('Entidad');
  });

  it('renderiza el cara a cara cuando faceEntityField está asignado', () => {
    const html = render(cfg('faceoff', {
      faceEntityField: 'entidad',
      faceIconField: 'icono',
      faceValueField: 'valor',
    }));
    expect(html).toContain('<svg');
    expect(html).not.toContain('Tus datos están listos');
  });

  it('sigue mostrando Sin datos cuando el dataset está vacío', () => {
    const html = render(cfg('bar'), []);
    expect(html).toContain('Sin datos para mostrar');
    expect(html).not.toContain('Tus datos están listos');
  });
});