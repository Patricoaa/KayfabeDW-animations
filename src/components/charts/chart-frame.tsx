'use client';

import type {ChartConfig, TextOverflow} from '@/lib/chart-config';
import type {ResolvedChartStyle} from '@/lib/chart-data';

export type LegendItem = {label: string; color: string};

let frameNs = 0;
export function nextSvgId(prefix: string): string {
  return `${prefix}-${frameNs++}`;
}

// Canvas: background and border as a full-canvas rect so exports include the
// "frame" (shared by every chart type).
export function frameRect(config: ChartConfig) {
  const w = config.width ?? 600;
  const h = config.height ?? 380;
  return (
    <rect
      x={0}
      y={0}
      width={w}
      height={h}
      rx={config.canvasBorderRadius ?? 0}
      fill={config.canvasBackground ?? 'none'}
      stroke={(config.canvasBorderWidth ?? 0) > 0 ? (config.canvasBorderColor ?? '#333') : 'none'}
      strokeWidth={config.canvasBorderWidth ?? 0}
    />
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Breaks a text into display lines honoring a font's overflow setting. 'auto'
// behaves as 'none' for header text (single, full line).
function textLines(s: string | undefined, fs: number, maxW: number, overflow?: TextOverflow): string[] {
  if (!s) return [];
  const cpl = Math.max(4, Math.floor(maxW / (fs * 0.62)));
  const mode = overflow ?? 'none';
  if (mode === 'none' || s.length <= cpl) return [s];
  if (mode === 'wrap') {
    const first = s.slice(0, cpl);
    const rest = s.slice(cpl);
    if (rest.length <= cpl) return [first, rest];
    return [first, rest.slice(0, cpl - 1) + '…'];
  }
  return [s.slice(0, cpl - 1) + '…'];
}

// Estimated text width (px) for the SVG legend layout. Fonts are small and
// monospace-ish in the panel, so a 0.55·fontSize factor per char is enough.
const textWidth = (s: string, fs: number) => Math.min(s.length, 24) * fs * 0.58;

// SVG path that rounds only the requested corners — used for the "pill on the
// outer end" bar look (barRadiusEndsOnly) instead of the all-corners `rx`.
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  corners: {tl?: boolean; tr?: boolean; bl?: boolean; br?: boolean} = {tl: true, tr: true, bl: true, br: true},
): string {
  const rad = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  const tl = corners.tl ? rad : 0;
  const tr = corners.tr ? rad : 0;
  const br = corners.br ? rad : 0;
  const bl = corners.bl ? rad : 0;
  const parts = [
    `M ${x + tl} ${y}`,
    `H ${x + w - tr}`,
    tr > 0 ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : '',
    `V ${y + h - br}`,
    br > 0 ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : '',
    `H ${x + bl}`,
    bl > 0 ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : '',
    `V ${y + tl}`,
    tl > 0 ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : '',
    'Z',
  ];
  return parts.join(' ');
}

// Vertical space (in SVG units) the header needs when placed at the top of the
// canvas. Renderers add this to margin.top so the plot doesn't overlap.
export function headerHeight(config: ChartConfig, st: ResolvedChartStyle, width = 600): number {
  const hasTitle = !!config.title;
  const hasSub = !!config.subtitle;
  if (!hasTitle && !hasSub) return 0;
  const titleSize = config.headerFont?.size ?? st.titleFontSize;
  const subSize = config.subtitleFont?.size ?? Math.max(8, titleSize - 3);
  const maxW = Math.max(120, width - 24);
  const titleLines = textLines(config.title ?? '', titleSize, maxW, config.headerFont?.overflow).length;
  const subLines = hasSub ? textLines(config.subtitle ?? '', subSize, maxW, config.subtitleFont?.overflow).length : 0;
  let h = titleLines * titleSize + 8;
  if (hasSub) h += subLines * subSize + 6;
  return h;
}

// Title + subtitle drawn inside the SVG (so exports include them).
export function SvgHeader({config, st, width}: {config: ChartConfig; st: ResolvedChartStyle; width: number}) {
  const title = config.title;
  const sub = config.subtitle;
  if (!title && !sub) return null;
  const hidden = config.hiddenElements ?? [];
  const family = config.headerFont?.fontFamily ?? st.fontFamily;
  const subFamily = config.subtitleFont?.fontFamily ?? family;
  const titleSize = config.headerFont?.size ?? st.titleFontSize;
  const titleColor = config.headerFont?.color ?? st.textColor;
  const subSize = config.subtitleFont?.size ?? Math.max(8, titleSize - 3);
  const subColor = config.subtitleFont?.color ?? st.textColor;
  const maxW = Math.max(120, width - 24);
  const titleLines = textLines(title, titleSize, maxW, config.headerFont?.overflow);
  const subLines = textLines(sub, subSize, maxW, config.subtitleFont?.overflow);
  const titleH = titleLines.length * titleSize;
  const titleOx = config.titleOffset?.x ?? 0;
  const titleOy = config.titleOffset?.y ?? 0;
  const subOx = config.subtitleOffset?.x ?? 0;
  const subOy = config.subtitleOffset?.y ?? 0;
  let y = 4 + titleSize;
  return (
    <g fontFamily={family} textAnchor="middle">
      {title && !hidden.includes('title') && (
        <g data-editable="title" data-element-name="Título" transform={`translate(${titleOx}, ${titleOy})`}>
          {titleLines.map((ln, i) => (
            <text key={`t-${i}`} x={width / 2} y={y + i * (titleSize + 2)} fill={titleColor} fontSize={titleSize} fontWeight={config.headerFont?.weight ?? 700}>
              {ln}
            </text>
          ))}
        </g>
      )}
      {sub && !hidden.includes('subtitle') && (
        <g data-editable="subtitle" data-element-name="Subtítulo" transform={`translate(${subOx}, ${subOy})`}>
          {subLines.map((ln, i) => (
            <text key={`s-${i}`} x={width / 2} y={4 + titleH + (titleLines.length > 0 ? 2 : 0) + subSize + i * (subSize + 2)} fill={subColor} fontSize={subSize} fontFamily={subFamily} fontWeight={config.subtitleFont?.weight ?? 400}>
              {ln}
            </text>
          ))}
        </g>
      )}
    </g>
  );
}

// Reserved margins (SVG units) for a rendered legend outside the plot area.
export function legendReserve(config: ChartConfig, items: LegendItem[]): {top: number; right: number; bottom: number} {
  if (!(config.showLegend ?? true) || items.length === 0) return {top: 0, right: 0, bottom: 0};
  const pos = config.legendPosition ?? 'bottom';
  if (pos === 'right') return {top: 0, right: 118, bottom: 0};
  return pos === 'top' ? {top: 20, right: 0, bottom: 0} : {top: 0, right: 0, bottom: 16};
}

// Legend rendered inside the SVG, adapting to top/right/bottom positions and
// capping items to fit the available space.
export function SvgLegend({
  items,
  position,
  width,
  height,
  st,
  config,
  headerOffset = 0,
}: {
  items: LegendItem[];
  position: 'top' | 'right' | 'bottom';
  width: number;
  height: number;
  st: ResolvedChartStyle;
  config: ChartConfig;
  headerOffset?: number;
}) {
  if (items.length === 0) return null;
  const hidden = config.hiddenElements ?? [];
  const legendOx = config.legendOffset?.x ?? 0;
  const legendOy = config.legendOffset?.y ?? 0;
  const fs = config.legendFont?.size ?? 10;
  const sw = Math.max(6, Math.round(fs * 0.8));
  const gap = 14;
  const family = config.legendFont?.fontFamily ?? st.fontFamily;
  const color = config.legendFont?.color ?? st.textColor;
  const weight = config.legendFont?.weight ?? 500;
  const labelOf = (s: string, max: number) => (config.legendFont?.overflow === 'none' ? s : truncate(s, max));

  if (position === 'right') {
    const x = width - 112;
    let y = 10;
    return (
      <g fontFamily={family} data-editable="legend" data-element-name="Leyenda" transform={`translate(${legendOx}, ${legendOy})`} style={hidden.includes('legend') ? {display: 'none'} : undefined}>
        {items.slice(0, 60).map((it) => {
          const el = (
            <g key={it.label} transform={`translate(${x}, ${y})`}>
              <rect x={0} y={-sw / 2} width={sw} height={sw} rx={2} fill={it.color} />
              <text x={sw + 6} y={0} fontSize={fs} fill={color} fontWeight={weight}>{labelOf(it.label, 15)}</text>
            </g>
          );
          y += 16;
          return el;
        })}
      </g>
    );
  }

  const avail = width - 24;
  const items2: LegendItem[] = [];
  let used = 0;
  for (const it of items) {
    const w = sw + 6 + textWidth(it.label, fs) + gap;
    if (used + w > avail && items2.length > 0) break;
    items2.push(it);
    used += w;
  }

  let x = Math.max(0, (width - used) / 2);
  const y = position === 'top' ? headerOffset + 13 : height - 8;
  return (
    <g fontFamily={family} data-editable="legend" data-element-name="Leyenda" transform={`translate(${legendOx}, ${legendOy})`} style={hidden.includes('legend') ? {display: 'none'} : undefined}>
      {items2.map((it) => {
        const el = (
          <g key={it.label} transform={`translate(${x}, ${y})`}>
            <rect x={0} y={-sw / 2} width={sw} height={sw} rx={2} fill={it.color} />
            <text x={sw + 6} y={0} fontSize={fs} fill={color} fontWeight={weight}>{labelOf(it.label, 24)}</text>
          </g>
        );
        x += sw + 6 + textWidth(it.label, fs) + gap;
        return el;
      })}
    </g>
  );
}