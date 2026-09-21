import {describe, expect, it} from 'vitest';
import type {ChartConfig} from './chart-config';
import {percentShareParts, preparePie, type PieSlice} from './chart-data';

const cfg = (partial?: Partial<ChartConfig>) => (partial ?? {}) as ChartConfig;

const sumParts = (parts: string[]) =>
  Math.round(parts.reduce((acc, p) => acc + parseFloat(p), 0) * 1000);

describe('percentShareParts', () => {
  it('reparte 3 partes iguales sin decimales sumando 100 (empate → primer índice)', () => {
    const parts = percentShareParts([1, 1, 1], 0);
    expect(parts).toEqual(['34%', '33%', '33%']);
    expect(sumParts(parts)).toBe(100000);
  });

  it('reparte 3 partes iguales con 1 decimal sumando 100 (empate → primer índice)', () => {
    const parts = percentShareParts([1, 1, 1], 1);
    expect(parts).toEqual(['33.4%', '33.3%', '33.3%']);
    expect(sumParts(parts)).toBe(100000);
  });

  it('reparte 3 partes iguales con 2 decimales sumando 100 (empate → primer índice)', () => {
    const parts = percentShareParts([1, 1, 1], 2);
    expect(parts).toEqual(['33.34%', '33.33%', '33.33%']);
    expect(sumParts(parts)).toBe(100000);
  });

  it('cuatro cuotas exactas de 25%', () => {
    expect(percentShareParts([1, 1, 1, 1], 0)).toEqual(['25%', '25%', '25%', '25%']);
  });

  it('cuotas 50/30/20 mantienen redondeo exacto con decimales', () => {
    expect(percentShareParts([50, 30, 20], 1)).toEqual(['50.0%', '30.0%', '20.0%']);
  });

  it('totales cero devuelven ceros a la precisión pedida', () => {
    expect(percentShareParts([0, 0], 0)).toEqual(['0%', '0%']);
    expect(percentShareParts([0, 0], 2)).toEqual(['0.00%', '0.00%']);
  });

  it('ignora pesos negativos/NaN y distribuye sobre los positivos', () => {
    expect(percentShareParts([2, -1, NaN, 2], 0)).toEqual(['50%', '0%', '0%', '50%']);
  });

  it('suma exacta a 100 para varios conjuntos y precisiones', () => {
    const sets = [
      [1, 1, 1, 1, 1, 1, 1],
      [3, 1, 4, 1, 5, 9, 2, 6],
      [7, 3, 1],
      [100],
    ];
    for (const weights of sets) {
      for (const p of [0, 1, 2, 3]) {
        const parts = percentShareParts(weights, p);
        expect(sumParts(parts), `${weights.join(',')} @ ${p}`).toBe(100000);
      }
    }
  });

  it('es determinista: mismo input, mismo output', () => {
    const a = percentShareParts([2, 2, 1, 5], 1);
    const b = percentShareParts([2, 2, 1, 5], 1);
    expect(a).toEqual(b);
  });
});

const sweep = (s: PieSlice) => s.endAngle - s.startAngle;
const sumValues = (s: PieSlice[]) => s.reduce((acc, x) => acc + x.value, 0);
const sumPercents = (s: PieSlice[]) =>
  Math.round(s.reduce((acc, x) => acc + parseFloat(x.percentLabel), 0) * 1000);

describe('preparePie', () => {
  it('parte en ángulos que suman 2π empezando en las 12 en punto', () => {
    const slices = preparePie(
      [
        {cat: 'A', val: 3},
        {cat: 'B', val: 1},
      ],
      {} as never,
    );
    expect(slices).toHaveLength(2);
    expect(slices[0].startAngle).toBeCloseTo(-Math.PI / 2, 10);
    expect(sweep(slices[0]) + sweep(slices[1])).toBeCloseTo(Math.PI * 2, 10);
    expect(sweep(slices[0])).toBeCloseTo((3 / 4) * Math.PI * 2, 10);
  });

  it('etiquetas de porcentaje suman 100', () => {
    const slices = preparePie([{cat: 'A', val: 7}, {cat: 'B', val: 2}, {cat: 'C', val: 1}], cfg());
    expect(sumPercents(slices)).toBe(100000);
  });

  it('sliceLimit fusiona el exceso en un slice «Otros» (preserva el 100%)', () => {
    const slices = preparePie(
      [{cat: 'A', val: 4}, {cat: 'B', val: 2}, {cat: 'C', val: 1}, {cat: 'D', val: 1}],
      cfg({sliceLimit: 2, sortBy: 'value-desc'}),
    );
    expect(slices.map((s) => s.label)).toEqual(['A', 'B', 'Otros']);
    expect(slices[2].value).toBe(2);
    expect(sumValues(slices)).toBe(8);
    expect(sumPercents(slices)).toBe(100000);
  });

  it('sliceLimit 0 (o ausente) no fusiona nada', () => {
    const slices = preparePie(
      [{cat: 'A', val: 3}, {cat: 'B', val: 2}, {cat: 'C', val: 1}],
      cfg(),
    );
    expect(slices.map((s) => s.label)).toEqual(['A', 'B', 'C']);
  });

  it('descarta valores cero y negativos', () => {
    const slices = preparePie(
      [{cat: 'A', val: 5}, {cat: 'B', val: 0}, {cat: 'C', val: -3}],
      cfg(),
    );
    expect(slices.map((s) => s.label)).toEqual(['A']);
    expect(slices[0].percentLabel).toBe('100%');
  });

  it('devuelve vacío si no hay valores positivos', () => {
    const slices = preparePie([{cat: 'A', val: 0}, {cat: 'B', val: -1}], cfg());
    expect(slices).toEqual([]);
  });

  it('aplica overrides de color por categoría (colorFor)', () => {
    const slices = preparePie(
      [{cat: 'A', val: 2}, {cat: 'B', val: 1}],
      cfg({colorOverrides: {A: '#111111'}}),
    );
    expect(slices[0].color).toBe('#111111');
    expect(slices[1].color).not.toBe('#111111');
  });
});