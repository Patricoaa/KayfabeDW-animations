'use client';

import type {ChartConfig, TextOverflow, SectionFont, TextLayout} from '@/lib/chart-config';
import type {ResolvedChartStyle} from '@/lib/chart-data';
import type {ReactNode} from 'react';

export type LegendItem = {label: string; color: string};

// Builds the legend items from data series, applying any per-item text
// override without breaking color matching (which keys on the original
// `label`). Resolution order for the visible text:
//   1. config.legendTextOverrides[label]   (applies to ALL chart types, incl.
//      category-based legends from pie/scatter)
//   2. config.legendItems[].overrideLabel  (legacy per-series override)
//   3. the original label.
export function legendItemsFrom<T>(
  series: T[],
  config: {legendItems?: {label: string; color: string; overrideLabel?: string}[]; legendTextOverrides?: Record<string, string>},
  labelOf: (s: T) => string,
  colorOf: (s: T) => string,
): LegendItem[] {
  const ovs = new Map((config.legendItems ?? []).map((li) => [li.label, li.overrideLabel]));
  return series.map((s) => {
    const key = labelOf(s);
    const text = config.legendTextOverrides?.[key]?.trim()
      || ovs.get(key)?.trim()
      || key;
    return {label: text, color: colorOf(s)};
  });
}

// Semantic zone wrapper so the SVG is structured by visual region
// (header / left-axis / plot / right-axis / footer) instead of flat children.
// Positions are unchanged; this only groups DOM for clarity and enables
// zone-level styling or toggling.
export function Zone({id, children}: {id: string; children: ReactNode}) {
  return <g id={`zone-${id}`} data-zone={id}>{children}</g>;
}

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
// Free-form positioned titles (titleLayout/subtitleLayout with explicit y)
// don't reserve space here — the user controls placement via spacing.
export function headerHeight(config: ChartConfig, st: ResolvedChartStyle, width = 600): number {
  const hasTitle = !!config.title;
  const hasSub = !!config.subtitle;
  if (!hasTitle && !hasSub) return 0;
  const freePlacement = !!config.titleLayout?.y || !!config.subtitleLayout?.y;
  if (freePlacement) return 0;
  const titleSize = config.headerFont?.size ?? st.titleFontSize;
  const subSize = config.subtitleFont?.size ?? Math.max(8, titleSize - 3);
  const maxW = Math.max(120, width - 24);
  const titleLines = textLines(config.title ?? '', titleSize, maxW, config.headerFont?.overflow).length;
  const subLines = hasSub ? textLines(config.subtitle ?? '', subSize, maxW, config.subtitleFont?.overflow).length : 0;
  let h = titleLines * titleSize + 8;
  if (hasSub) h += subLines * subSize + 6;
  return h;
}

// Renders one title/subtitle block with optional Canva-style placement.
function TitleBlock({
  text, font, baseColor, defaultWeight, width, layout,
}: {
  text: string;
  font: SectionFont | undefined;
  baseColor: string;
  defaultWeight: number;
  width: number;
  layout?: TextLayout;
}) {
  const size = font?.size ?? 0;
  const maxW = Math.max(120, width - 24);
  const lines = textLines(text, size, maxW, font?.overflow ?? 'none');
  const lineH = layout?.lineHeight ?? size + 2;
  const ls = layout?.letterSpacing ?? 0;
  const opacity = layout?.opacity ?? 1;
  const color = layout?.color ?? font?.color ?? baseColor;
  const family = font?.fontFamily;
  const weight = font?.weight ?? defaultWeight;

  // Anchor reference x (left edge of the text box).
  let refX: number;
  const align = layout?.align ?? 'center';
  if (layout) {
    const a = layout.anchor ?? 'center';
    refX = a === 'left' ? (layout.x ?? 0) : a === 'right' ? width - (layout.x ?? 0) : width / 2 + (layout.x ?? 0);
  } else {
    refX = width / 2;
  }

  const textStart = align === 'left' ? refX : align === 'right' ? refX - textWidth(text, size) : refX - textWidth(text, size) / 2;
  const top = (layout?.y ?? 0) + 4;
  const bgPad = layout?.bgPadding ?? 4;
  const lineTops = lines.map((_, i) => top + i * lineH + size / 2);

  return (
    <g
      fontFamily={family}
      fontWeight={weight}
      transform={layout?.rotation ? `rotate(${layout.rotation}, ${refX}, ${layout.y ?? 0})` : undefined}
      opacity={opacity}
    >
      {layout?.bgColor && (
        <rect
          x={textStart - bgPad}
          y={top - bgPad}
          width={textWidth(text, size) + bgPad * 2}
          height={lines.length * lineH + bgPad * 2}
          rx={layout.bgRadius ?? 4}
          fill={layout.bgColor}
          opacity={layout.bgOpacity ?? 1}
        />
      )}
      {lines.map((ln, i) => (
        <text
          key={i}
          x={align === 'right' ? textStart + textWidth(text, size) : textStart}
          y={lineTops[i]}
          fill={color}
          fontSize={size}
          textAnchor={align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'}
          letterSpacing={ls}
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

// Title + subtitle drawn inside the SVG (so exports include them).
export function SvgHeader({config, st, width}: {config: ChartConfig; st: ResolvedChartStyle; width: number}) {
  const title = config.title;
  const sub = config.subtitle;
  if (!title && !sub) return null;
  const family = config.headerFont?.fontFamily ?? st.fontFamily;
  const subFamily = config.subtitleFont?.fontFamily ?? family;
  const titleSize = config.headerFont?.size ?? st.titleFontSize;
  const titleColor = config.headerFont?.color ?? st.textColor;
  const subSize = config.subtitleFont?.size ?? Math.max(8, titleSize - 3);
  const subColor = config.subtitleFont?.color ?? st.textColor;

  if (config.titleLayout?.y || config.subtitleLayout?.y) {
    // Free-form placement: render each block independently at its own position.
    return (
      <g>
        {title && (
          <TitleBlock text={title} font={config.headerFont} baseColor={titleColor} defaultWeight={700} width={width} layout={config.titleLayout} />
        )}
        {sub && (
          <TitleBlock text={sub} font={{...(config.subtitleFont ?? {}), fontFamily: subFamily}} baseColor={subColor} defaultWeight={400} width={width} layout={config.subtitleLayout} />
        )}
      </g>
    );
  }

  const maxW = Math.max(120, width - 24);
  const titleLines = textLines(title, titleSize, maxW, config.headerFont?.overflow);
  const subLines = textLines(sub, subSize, maxW, config.subtitleFont?.overflow);
  const titleH = titleLines.length * titleSize;
  let y = 4 + titleSize;
  return (
    <g fontFamily={family} fontWeight={config.headerFont?.weight ?? 700} textAnchor="middle">
      {title && titleLines.map((ln, i) => (
        <text key={`t-${i}`} x={width / 2} y={y + i * (titleSize + 2)} fill={titleColor} fontSize={titleSize}>
          {ln}
        </text>
      ))}
      {sub && subLines.map((ln, i) => (
        <text key={`s-${i}`} x={width / 2} y={4 + titleH + (titleLines.length > 0 ? 2 : 0) + subSize + i * (subSize + 2)} fill={subColor} fontSize={subSize} fontFamily={subFamily} fontWeight={config.subtitleFont?.weight ?? 400}>
          {ln}
        </text>
      ))}
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
  const fs = config.legendFont?.size ?? 10;
  const sw = Math.max(6, Math.round(fs));
  const gap = 14;
  const family = config.legendFont?.fontFamily ?? st.fontFamily;
  const color = config.legendFont?.color ?? st.textColor;
  const weight = config.legendFont?.weight ?? 500;
  const labelOf = (s: string, max: number) => (config.legendFont?.overflow === 'none' ? s : truncate(s, max));

  if (position === 'right') {
    const x = width - 112;
    let y = 10;
    return (
      <g fontFamily={family}>
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
    <g fontFamily={family}>
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