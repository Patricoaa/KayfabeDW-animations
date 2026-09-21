import {describe, expect, it} from 'vitest';
import type {ChartConfig} from './chart-config';
import {legendOverrideKeys} from './legend-override';

const cfg = (partial?: Partial<ChartConfig>) => (partial ?? {}) as ChartConfig;

const data = [
  {time_allocation: 'in_ring_duration', gender: 'female'},
  {time_allocation: 'event_total_duration', gender: 'mixed'},
  {time_allocation: 'non_in_ring_duration', gender: 'male'},
];

describe('legendOverrideKeys', () => {
  it('torta usa las categorías del xField, ignorando seriesField residual', () => {
    const keys = legendOverrideKeys(cfg({
      type: 'pie',
      xField: 'time_allocation',
      seriesField: 'gender',
      legendItems: [
        {label: 'female', color: '#0072B2'},
        {label: 'mixed', color: '#E69F00'},
        {label: 'male', color: '#009E73'},
      ],
    }), data);
    expect(keys).toEqual(['in_ring_duration', 'event_total_duration', 'non_in_ring_duration']);
  });

  it('torta sin seriesField lista las categorías', () => {
    const keys = legendOverrideKeys(cfg({type: 'pie', xField: 'time_allocation'}), data);
    expect(keys).toEqual(['in_ring_duration', 'event_total_duration', 'non_in_ring_duration']);
  });

  it('torta con sliceLimit expone el slice sintético "Otros"', () => {
    const keys = legendOverrideKeys(cfg({type: 'pie', xField: 'time_allocation', sliceLimit: 2}), data);
    expect(keys).toEqual(['in_ring_duration', 'event_total_duration', 'non_in_ring_duration', 'Otros']);
  });

  it('torta con categoría vacía keyea igual que prepareSeries (empty string)', () => {
    const keys = legendOverrideKeys(cfg({type: 'pie', xField: 'time_allocation'}), [
      {time_allocation: ''},
      {time_allocation: 'in_ring_duration'},
    ]);
    expect(keys).toEqual(['', 'in_ring_duration']);
  });

  it('barras multi-série usa los nombres de serie (legendItems)', () => {
    const keys = legendOverrideKeys(cfg({
      type: 'bar',
      xField: 'time_allocation',
      seriesField: 'gender',
      legendItems: [
        {label: 'female', color: '#0072B2'},
        {label: 'mixed', color: '#E69F00'},
        {label: 'male', color: '#009E73'},
      ],
    }), data);
    expect(keys).toEqual(['female', 'mixed', 'male']);
  });

  it('barras de serie única usa las categorías del xField', () => {
    const keys = legendOverrideKeys(cfg({type: 'bar', xField: 'time_allocation'}), data);
    expect(keys).toEqual(['in_ring_duration', 'event_total_duration', 'non_in_ring_duration']);
  });

  it('cap a 50 categorías', () => {
    const rows = Array.from({length: 60}, (_, i) => ({time_allocation: `cat${i}`}));
    const keys = legendOverrideKeys(cfg({type: 'pie', xField: 'time_allocation'}), rows);
    expect(keys.length).toBe(50);
  });

  it('sliceLimit tras el cap de 50 aún expone el slice sintético "Otros"', () => {
    const rows = Array.from({length: 60}, (_, i) => ({time_allocation: `cat${i}`}));
    const keys = legendOverrideKeys(cfg({type: 'pie', xField: 'time_allocation', sliceLimit: 3}), rows);
    expect(keys).toEqual([...Array.from({length: 50}, (_, i) => `cat${i}`), 'Otros']);
  });
});