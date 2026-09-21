import {describe, expect, it} from 'vitest';
import type {ChartConfig} from './chart-config';
import {prepareFaceOff, type FaceOffEntity} from './chart-data';

const cfg = (partial?: Partial<ChartConfig>) => (partial ?? {}) as ChartConfig;

const img = (n: number) => `https://cdn.example.com/icon-${n}.png`;

// Dataset de ejemplo: 1 fila por logro/racha, varias filas por entidad.
function faceoffData(): Record<string, unknown>[] {
  return [
    {wrestler: 'Omega', name: 'Kenny Omega', photo: 'https://cdn.example.com/omega.jpg', trophy: img(1), ach: 'Reinado AEW', n: 3},
    {wrestler: 'Omega', name: 'Kenny Omega', photo: 'https://cdn.example.com/omega.jpg', trophy: img(2), ach: 'Reinado IWGP', n: 2},
    {wrestler: 'Omega', name: 'Kenny Omega', trophy: img(3), ach: 'G1 Climax', n: 1},
    {wrestler: 'Ospreay', name: 'Will Ospreay', photo: 'https://cdn.example.com/ospreay.jpg', trophy: img(4), ach: 'NJPW World', n: 2},
    {wrestler: 'Ospreay', name: 'Will Ospreay', photo: 'https://cdn.example.com/ospreay.jpg', trophy: img(5), ach: 'IWGP Heavyweight', n: 1},
    {wrestler: 'Tanahashi', name: 'Hiroshi Tanahashi', photo: 'https://cdn.example.com/tana.jpg', trophy: img(6), ach: 'Reinado IWGP', n: 8},
  ];
}

describe('prepareFaceOff', () => {
  it('agrupa por entidad y toma las 2 primeras en orden de aparición', () => {
    const entities = prepareFaceOff(faceoffData(), cfg({
      faceEntityField: 'wrestler',
      faceIconField: 'trophy',
      faceTitleField: 'ach',
      faceValueField: 'n',
    }));
    expect(entities.map((e) => e.key)).toEqual(['Omega', 'Ospreay']);
  });

  it('resuelve nombre y foto desde la primera fila de cada grupo', () => {
    const entities = prepareFaceOff(faceoffData(), cfg({
      faceEntityField: 'wrestler',
      faceNameField: 'name',
      faceImageField: 'photo',
      faceIconField: 'trophy',
      faceTitleField: 'ach',
      faceValueField: 'n',
    }));
    expect(entities[0].name).toBe('Kenny Omega');
    expect(entities[0].image).toBe('https://cdn.example.com/omega.jpg');
    expect(entities[1].name).toBe('Will Ospreay');
  });

  it('cae al valor de entidad como nombre cuando no hay columna de nombre', () => {
    const entities = prepareFaceOff(faceoffData(), cfg({
      faceEntityField: 'wrestler',
      faceIconField: 'trophy',
      faceValueField: 'n',
    }));
    expect(entities[0].name).toBe('Omega');
  });

  it('construye un tile por fila con icono, título y valor', () => {
    const entities = prepareFaceOff(faceoffData(), cfg({
      faceEntityField: 'wrestler',
      faceIconField: 'trophy',
      faceTitleField: 'ach',
      faceValueField: 'n',
    }));
    expect(entities[0].tiles).toEqual([
      {icon: img(1), title: 'Reinado AEW', value: 3},
      {icon: img(2), title: 'Reinado IWGP', value: 2},
      {icon: img(3), title: 'G1 Climax', value: 1},
    ]);
  });

  it('descarta filas sin icono o con valor no numérico', () => {
    const data: Record<string, unknown>[] = [
      {f: 'A', icon: img(1), t: 'ok', v: 2},
      {f: 'A', icon: '', t: 'sin icono', v: 5},
      {f: 'A', icon: img(2), t: 'nan', v: 'x'},
      {f: 'A', icon: img(3), t: 'undefined', v: undefined},
      {f: 'B', icon: img(4), t: 'ok', v: 1},
    ];
    const entities = prepareFaceOff(data, cfg({
      faceEntityField: 'f',
      faceIconField: 'icon',
      faceTitleField: 't',
      faceValueField: 'v',
    }));
    expect(entities[0].tiles).toEqual([{icon: img(1), title: 'ok', value: 2}]);
  });

  it('respeta faceMaxTiles por entidad', () => {
    const entities = prepareFaceOff(faceoffData(), cfg({
      faceEntityField: 'wrestler',
      faceIconField: 'trophy',
      faceTitleField: 'ach',
      faceValueField: 'n',
      faceMaxTiles: 2,
    }));
    expect(entities[0].tiles.length).toBe(2);
  });

  it('faceSwap invierte izquierda/derecha', () => {
    const base = {
      faceEntityField: 'wrestler',
      faceNameField: 'name',
      faceImageField: 'photo',
      faceIconField: 'trophy',
      faceValueField: 'n',
    };
    const normal = prepareFaceOff(faceoffData(), cfg(base));
    const swapped = prepareFaceOff(faceoffData(), cfg({...base, faceSwap: true}));
    expect(swapped[0].key).toBe('Ospreay');
    expect(swapped[1].key).toBe('Omega');
    expect(normal[0].key).toBe('Omega');
  });

  it('devuelve [] cuando faltan campos obligatorios o no hay filas', () => {
    expect(prepareFaceOff(faceoffData(), cfg({faceIconField: 'trophy', faceValueField: 'n'}))).toEqual([]);
    expect(prepareFaceOff(faceoffData(), cfg({faceEntityField: 'wrestler', faceIconField: 'trophy'}))).toEqual([]);
    expect(prepareFaceOff([], cfg({
      faceEntityField: 'wrestler',
      faceIconField: 'trophy',
      faceValueField: 'n',
    }))).toEqual([]);
  });

  it('devuelve 1 sola entidad si el dataset solo tiene una', () => {
    const data = [faceoffData()[0], faceoffData()[1], faceoffData()[2]];
    const entities = prepareFaceOff(data, cfg({
      faceEntityField: 'wrestler',
      faceIconField: 'trophy',
      faceTitleField: 'ach',
      faceValueField: 'n',
    }));
    expect(entities.length).toBe(1);
    expect(entities[0].key).toBe('Omega');
    expect(entities[0].accent).toBeTruthy();
  });

  it('tipo: FaceOffEntity expone la estructura esperada', () => {
    const entities: FaceOffEntity[] = prepareFaceOff(faceoffData(), cfg({
      faceEntityField: 'wrestler',
      faceIconField: 'trophy',
      faceValueField: 'n',
    }));
    expect(typeof entities[0].accent).toBe('string');
    expect(Array.isArray(entities[0].tiles)).toBe(true);
  });
});