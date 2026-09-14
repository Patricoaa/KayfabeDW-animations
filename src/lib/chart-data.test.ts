import {describe, expect, it} from 'vitest';
import {percentShareParts} from './chart-data';

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