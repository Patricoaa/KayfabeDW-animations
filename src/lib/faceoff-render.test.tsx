import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';

import {applyChartDefaults} from '@/lib/chart-config';
import {FaceOffChart} from '@/components/charts/faceoff-chart';

function cfg(overrides: Record<string, unknown> = {}) {
  return applyChartDefaults({
    type: 'faceoff',
    title: 'Campeonatos',
    faceEntityField: 'entidad',
    faceNameField: 'nombre',
    faceImageField: 'foto',
    faceIconField: 'icono',
    faceTitleField: 'titulo',
    faceValueField: 'valor',
    ...overrides,
  });
}

const data: Record<string, unknown>[] = [
  {entidad: 'A', nombre: 'Rey Misterio', foto: 'http://x/a.png', icono: 'http://x/i1.png', titulo: 'Mundial', valor: 3},
  {entidad: 'A', nombre: 'Rey Misterio', foto: 'http://x/a.png', icono: 'http://x/i2.png', titulo: 'Equipos', valor: 2},
  {entidad: 'A', nombre: 'Rey Misterio', foto: 'http://x/a.png', icono: 'http://x/i3.png', titulo: 'Tag Team', valor: 1},
  {entidad: 'B', nombre: 'Tribu', foto: 'http://x/b.png', icono: 'http://x/j1.png', titulo: 'Intercontinental', valor: 4},
  {entidad: 'B', nombre: 'Tribu', foto: 'http://x/b.png', icono: 'http://x/j2.png', titulo: 'Rey del Ring', valor: 5},
];

function render(c: ReturnType<typeof cfg>, rows = data) {
  return renderToStaticMarkup(<FaceOffChart data={rows} config={c} />);
}

describe('FaceOffChart render', () => {
  it('renders both entities centered in their half', () => {
    const html = render(cfg());
    expect(html).toContain('Rey Misterio');
    expect(html).toContain('Tribu');
    expect(html).toContain('<svg');
  });

  it('draws photos with clipPath for both sides', () => {
    const html = render(cfg());
    expect(html.match(/<clipPath/g)).toHaveLength(2);
    expect(html).toContain('http://x/a.png');
    expect(html).toContain('http://x/b.png');
  });

  it('renders one tile per row with icon, title and formatted value', () => {
    const html = render(cfg());
    expect(html).toContain('http://x/i1.png');
    expect(html).toContain('Mundial');
    expect(html).toContain('3');
    expect(html).toContain('Rey del Ring');
    expect(html).toContain('5');
  });

  it('draws the VS divider when faceVsLabel is set', () => {
    const html = render(cfg());
    expect(html).toContain('>VS</text>');
    expect(html).toContain('<line');
    expect(html).toContain('<circle r="12"');
  });

  it('hides the VS divider when faceVsLabel is empty', () => {
    const html = render(cfg({faceVsLabel: ''}));
    expect(html).not.toContain('>VS</text>');
    expect(html).not.toContain('<line');
    expect(html).not.toContain('<circle r="12"');
  });

  it('shows placeholder initials when the entity has no photo', () => {
    const noPhoto = data.map(({foto: _foto, ...r}) => r);
    const html = render(cfg(), noPhoto);
    expect(html).toContain('>R</text>');
    expect(html).toContain('>T</text>');
  });

  it('caps tiles per entity by faceMaxTiles', () => {
    const html = render(cfg({faceMaxTiles: 2}));
    expect(html).toContain('http://x/i1.png');
    expect(html).toContain('http://x/i2.png');
    expect(html).not.toContain('http://x/i3.png');
  });

  it('renders nothing inside the plot when there is no data', () => {
    const html = render(cfg(), []);
    expect(html).toContain('<svg');
    expect(html).not.toContain('>Rey Misterio</text>');
    expect(html).not.toContain('ng>VS<');
  });

  it('centers a single entity and omits the VS divider', () => {
    const one = data.filter((r) => r.entidad === 'A');
    const html = render(cfg(), one);
    expect(html).toContain('Rey Misterio');
    expect(html).not.toContain('Tribu');
    expect(html).not.toContain('ng>VS<');
  });

  it('honors faceSwap', () => {
    const plain = render(cfg());
    const swapped = render(cfg({faceSwap: true}));
    const x0 = /<image href="http:\/\/x\/a\.png" x="(\d+\.?\d*)"/.exec(plain)?.[1];
    const x1 = /<image href="http:\/\/x\/a\.png" x="(\d+\.?\d*)"/.exec(swapped)?.[1];
    expect(x0).toBeTruthy();
    expect(x1).toBeTruthy();
    expect(x1).not.toBe(x0);
  });

  it('centers the divider with symmetric bands', () => {
    const html = render(cfg({width: 600}));
    const w = 600;
    expect(html).toContain(`<line x1="${w / 2}"`);
    const xs = [...html.matchAll(/<image href="http:\/\/x\/(a|b)\.png" x="([\d.]+)"\s*[^>]*width="72"/g)]
      .map((m) => Number(m[2]) + 36);
    expect(xs).toHaveLength(2);
    expect(Math.round(xs[0] + xs[1])).toBe(w); // ambas bandas simétricas alrededor del centro
  });
});