'use client';

import type {ChartConfig, TextOverflow, SectionFont, TextLayout, TextAlign} from '@/lib/chart-config';
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

// Canvas: background layer + border as the first painted elements of the SVG
// (shared by every chart type). Background lives inside the SVG so exports
// (SVG / PNG / JPG raster) inherit it exactly as the preview shows it.
export function frameRect(config: ChartConfig) {
  const w = config.width ?? 600;
  const h = config.height ?? 380;
  return (
    <g>
      <CanvasBackground config={config} w={w} h={h} />
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={config.canvasBorderRadius ?? 0}
        fill="none"
        stroke={(config.canvasBorderWidth ?? 0) > 0 ? (config.canvasBorderColor ?? '#333') : 'none'}
        strokeWidth={config.canvasBorderWidth ?? 0}
      />
    </g>
  );
}

// Module-level counter keeps background gradient/pattern/filter ids unique
// across charts on the same page (the SVG rasterizer needs local refs).
let bgNs = 0;

// Angle (deg, CSS `linear-gradient` convention) → gradient endpoint vector.
// 90° = left→right, 180° = top→bottom, 135° = top-left→bottom-right.
function gradientVec(angle: number): {x1: number; y1: number; x2: number; y2: number} {
  const a = ((angle - 90) * Math.PI) / 180;
  return {x1: 0.5 - Math.cos(a) * 0.5, y1: 0.5 - Math.sin(a) * 0.5, x2: 0.5 + Math.cos(a) * 0.5, y2: 0.5 + Math.sin(a) * 0.5};
}

// Full-canvas background drawn below everything: solid color, pattern preset,
// gradient or loaded image. Painted with SVG primitives inside the SVG element
// so the static export (which serializes/rasterizes that SVG) matches the
// live preview pixel-for-pixel, including fonts and external images already
// handled by export-static's font embedding + image inlining.
export function CanvasBackground({config, w, h}: {config: ChartConfig; w: number; h: number}) {
  const type = config.backgroundType ?? 'none';
  if (type === 'none') return null;
  const opacity = config.backgroundOpacity ?? 1;
  const rx = config.canvasBorderRadius ?? 0;
  const uid = `cbg-${bgNs++}`;

  if (type === 'color') {
    const fill = config.background ?? '#0a0a0a';
    return <rect x={0} y={0} width={w} height={h} rx={rx} fill={fill} opacity={opacity} />;
  }

  if (type === 'gradient') {
    const a = gradientVec(config.backgroundAngle ?? 135);
    return (
      <g opacity={opacity}>
        <defs>
          <linearGradient id={uid} x1={`${a.x1}`} y1={`${a.y1}`} x2={`${a.x2}`} y2={`${a.y2}`}>
            <stop offset="0%" stopColor={config.background ?? '#0a0a0a'} />
            <stop offset="100%" stopColor={config.backgroundSecondary ?? '#1f2937'} />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={w} height={h} rx={rx} fill={`url(#${uid})`} />
      </g>
    );
  }

  if (type === 'image') {
    const base = config.background ?? '#0a0a0a';
    const fit = config.backgroundFit ?? 'cover';
    // SVG preserveAspectRatio equivalents of the CSS background-size values.
    const par =
      fit === 'contain' ? 'xMidYMid meet' : fit === 'fill' ? 'none' : 'xMidYMid slice';
    const blur = config.backgroundBlur ?? 0;
    return (
      <g opacity={opacity}>
        <defs>
          {blur > 0 && (
            <filter id={`${uid}-blur`} x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation={blur} />
            </filter>
          )}
          {rx > 0 && (
            <clipPath id={`${uid}-clip`}>
              <rect x={0} y={0} width={w} height={h} rx={rx} />
            </clipPath>
          )}
        </defs>
        <rect x={0} y={0} width={w} height={h} fill={base} />
        {config.backgroundImage && (
          <image
            href={config.backgroundImage}
            x={0}
            y={0}
            width={w}
            height={h}
            preserveAspectRatio={par}
            filter={blur > 0 ? `url(#${uid}-blur)` : undefined}
            clipPath={rx > 0 ? `url(#${uid}-clip)` : undefined}
          />
        )}
      </g>
    );
  }

  // pattern
  const fg = config.background ?? '#3b82f6';
  const pattern = config.backgroundPattern ?? 'dots';
  const angle = config.backgroundAngle ?? 45;
  const size = 26;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <g opacity={opacity}>
      <defs>
        <pattern id={uid} width={size} height={size} patternUnits="userSpaceOnUse">
          <rect width={size} height={size} fill="#000" />
          {pattern === 'dots' && <circle cx={cx} cy={cy} r={4} fill={fg} />}
          {pattern === 'grid' && (
            <>
              <line x1={0} y1={0} x2={size} y2={0} stroke={fg} strokeWidth={1} />
              <line x1={0} y1={0} x2={0} y2={size} stroke={fg} strokeWidth={1} />
            </>
          )}
          {pattern === 'checkers' && (
            <>
              <rect x={0} y={0} width={cx} height={cx} fill={fg} />
              <rect x={cx} y={cx} width={cx} height={cx} fill={fg} />
            </>
          )}
          {pattern === 'stripes' && (
            <g transform={`rotate(${angle} ${cx} ${cy})`}>
              <rect x={-size} y={4} width={size * 3} height={10} fill={fg} />
            </g>
          )}
        </pattern>
      </defs>
      <rect x={0} y={0} width={w} height={h} rx={rx} fill={`url(#${uid})`} />
    </g>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Maps a text-align setting to the SVG horizontal text anchor. Absent/auto
// defaults to centered (the classic behavior for headers/legends).
const anchorOf = (a?: TextAlign): 'start' | 'middle' | 'end' =>
  a === 'left' ? 'start' : a === 'right' ? 'end' : 'middle';

// Bottom x-axis title honoring the xLabel font's alignment (left/center/right).
export function XAxisTitle({text, width, height, color, size, family, weight, align}: {
  text: string; width: number; height: number; color: string; size: number; family?: string; weight?: number; align?: TextAlign;
}) {
  const a = anchorOf(align);
  const x = a === 'start' ? 12 : a === 'end' ? width - 12 : width / 2;
  return (
    <text x={x} y={height - 6} textAnchor={a} fill={color} fontSize={size} fontFamily={family} fontWeight={weight}>{text}</text>
  );
}

// Left y-axis title (rotated -90°) honoring the yLabel font's alignment.
// For a vertical column, 'left' tips the text toward the plot top, 'right'
// toward the plot bottom, 'center' keeps it vertically centered.
export function YAxisTitle({text, height, color, size, family, weight, align, x = 14}: {
  text: string; height: number; color: string; size: number; family?: string; weight?: number; align?: TextAlign; x?: number;
}) {
  const a = anchorOf(align);
  const y = a === 'start' ? 12 : a === 'end' ? height - 12 : height / 2;
  return (
    <text x={x} y={y} textAnchor="middle" fill={color} fontSize={size} fontFamily={family} fontWeight={weight} transform={`rotate(-90, ${x}, ${y})`}>{text}</text>
  );
}

// Breaks a text into display lines honoring hard line breaks (`\n`) and a
// font's overflow setting. 'auto' behaves as 'none' for header text (single,
// full line). Each explicit paragraph is processed independently.
function textLines(s: string | undefined, fs: number, maxW: number, overflow?: TextOverflow): string[] {
  if (!s) return [];
  const cpl = Math.max(4, Math.floor(maxW / (fs * 0.62)));
  const mode = overflow ?? 'none';
  const seg = (t: string): string[] => {
    if (mode === 'none' || t.length <= cpl) return [t];
    if (mode === 'wrap') {
      const out: string[] = [];
      for (let i = 0; i < t.length; i += cpl) out.push(t.slice(i, i + cpl));
      return out;
    }
    return [t.slice(0, cpl - 1) + '…'];
  };
  return s.split('\n').flatMap((ln) => seg(ln));
}

// Estimated text width (px) for the SVG legend layout. Fonts are small and
// monospace-ish in the panel, so a 0.55·fontSize factor per char is enough.
const textWidth = (s: string, fs: number) => Math.min(s.length, 24) * fs * 0.58;

// Legend layout metrics. Item widths use the FULL visible label (no 24-char
// cap) with a generous 0.62·fontSize factor so proportional fonts never let a
// neighbor item underlap; pad/gap give each entry comfortable internal room.
const LEGEND_PAD = 7;        // swatch → label
const LEGEND_ITEM_GAP = 16;  // between items
const LEGEND_CHAR_W = 0.62;  // average glyph width factor
const legendTextW = (s: string, fs: number) => s.length * fs * LEGEND_CHAR_W;
const legendItemW = (label: string, fs: number, sw: number) =>
  sw + LEGEND_PAD + legendTextW(label, fs) + LEGEND_ITEM_GAP;

// The label actually rendered for a legend entry (honors the font overflow:
// 'none' draws it whole, otherwise it's truncated to `max` chars).
const legendDisplay = (label: string, max: number, overflow?: TextOverflow) =>
  overflow === 'none' ? label : truncate(label, max);

// Greedy multi-row wrap so EVERY legend item with data stays visible. A solo
// item wider than `avail` is kept alone on its row and gets truncated by the
// renderer (legendDisplay max) so it cannot overlap its neighbors.
function wrapLegendItems(items: LegendItem[], slot: (it: LegendItem) => number, avail: number): LegendItem[][] {
  const rows: LegendItem[][] = [];
  let current: LegendItem[] = [];
  let used = 0;
  for (const it of items) {
    const w = slot(it);
    if (current.length > 0 && used + w > avail) {
      rows.push(current);
      current = [];
      used = 0;
    }
    current.push(it);
    used += w;
  }
  if (current.length) rows.push(current);
  return rows;
}

// Per-corner corner radius of a rounded rect (px).
export type CornerRadii = {tl?: number; tr?: number; bl?: number; br?: number};

// SVG path that rounds only the requested corners — used for the stacked "pill
// on the outer end" bar look. `r` can be a single radius (all enabled corners)
// or per-corner radii; a missing corner radius is treated as 0 (sharp).
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | CornerRadii = 0,
  corners: {tl?: boolean; tr?: boolean; bl?: boolean; br?: boolean} = {tl: true, tr: true, bl: true, br: true},
): string {
  const max = Math.max(0, Math.min(w, h) / 2);
  const R: CornerRadii = typeof r === 'number' ? {tl: r, tr: r, bl: r, br: r} : r;
  const rad = (v: number | undefined) => Math.max(0, Math.min(v ?? 0, max));
  const tl = corners.tl ? rad(R.tl) : 0;
  const tr = corners.tr ? rad(R.tr) : 0;
  const br = corners.br ? rad(R.br) : 0;
  const bl = corners.bl ? rad(R.bl) : 0;
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
  const freePlacement = (config.titleLayout && (config.titleLayout.x != null || config.titleLayout.y != null))
    || (config.subtitleLayout && (config.subtitleLayout.x != null || config.subtitleLayout.y != null));
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
  text, font, baseColor, defaultWeight, width, layout, defaultSize,
}: {
  text: string;
  font: SectionFont | undefined;
  baseColor: string;
  defaultWeight: number;
  width: number;
  layout?: TextLayout;
  defaultSize: number;
}) {
  const size = font?.size ?? defaultSize;
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

  const boxW = Math.max(...lines.map((l) => textWidth(l, size)));

  const textStart = align === 'left' ? refX : align === 'right' ? refX - boxW : refX - boxW / 2;
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
          width={boxW + bgPad * 2}
          height={lines.length * lineH + bgPad * 2}
          rx={layout.bgRadius ?? 4}
          fill={layout.bgColor}
          opacity={layout.bgOpacity ?? 1}
        />
      )}
      {lines.map((ln, i) => (
        <text
          key={i}
          x={align === 'right' ? textStart + boxW : textStart}
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

  if ((config.titleLayout && (config.titleLayout.x != null || config.titleLayout.y != null))
      || (config.subtitleLayout && (config.subtitleLayout.x != null || config.subtitleLayout.y != null))) {
    // Free-form placement: render each block independently at its own position.
    // When both blocks share the same anchor point (joint position control),
    // the subtitle stacks below the title block instead of overlapping it.
    const tl = config.titleLayout;
    const sl = config.subtitleLayout;
    const joint = !!(title && sub && tl && sl && tl.x === sl.x && tl.y === sl.y);
    let subLayout = sl;
    if (joint) {
      const tLines = textLines(title, titleSize, Math.max(120, width - 24), config.headerFont?.overflow).length;
      const tLineH = tl.lineHeight ?? titleSize + 2;
      subLayout = {...sl, y: (tl.y ?? 0) + tLines * tLineH + 6};
    }
    return (
      <g>
        {title && (
          <TitleBlock text={title} font={config.headerFont} baseColor={titleColor} defaultWeight={700} width={width} layout={tl} defaultSize={titleSize} />
        )}
        {sub && (
          <TitleBlock text={sub} font={{...(config.subtitleFont ?? {}), fontFamily: subFamily}} baseColor={subColor} defaultWeight={400} width={width} layout={subLayout} defaultSize={subSize} />
        )}
      </g>
    );
  }

  const maxW = Math.max(120, width - 24);
  const titleLines = textLines(title, titleSize, maxW, config.headerFont?.overflow);
  const subLines = textLines(sub, subSize, maxW, config.subtitleFont?.overflow);
  const titleH = titleLines.length * titleSize;
  let y = 4 + titleSize;
  const titleAnchor = anchorOf(config.headerFont?.align);
  const subAnchor = anchorOf(config.subtitleFont?.align);
  const titleX = titleAnchor === 'start' ? 12 : titleAnchor === 'end' ? width - 12 : width / 2;
  const subX = subAnchor === 'start' ? 12 : subAnchor === 'end' ? width - 12 : width / 2;
  return (
    <g fontFamily={family} fontWeight={config.headerFont?.weight ?? 700}>
      {title && titleLines.map((ln, i) => (
        <text key={`t-${i}`} x={titleX} y={y + i * (titleSize + 2)} fill={titleColor} fontSize={titleSize} textAnchor={titleAnchor}>
          {ln}
        </text>
      ))}
      {sub && subLines.map((ln, i) => (
        <text key={`s-${i}`} x={subX} y={4 + titleH + (titleLines.length > 0 ? 2 : 0) + subSize + i * (subSize + 2)} fill={subColor} fontSize={subSize} fontFamily={subFamily} fontWeight={config.subtitleFont?.weight ?? 400} textAnchor={subAnchor}>
          {ln}
        </text>
      ))}
    </g>
  );
}

// Reserved margins (SVG units) for a rendered legend outside the plot area.
// Free coordinates (legendLayout with explicit x/y) reserve nothing: the
// legend is drawn over the canvas wherever the offsets point. Top/bottom
// legends wrap to multiple rows and reserve one row of height per extra line,
// keeping single-row layouts pixel-identical to before.
export function legendReserve(config: ChartConfig, items: LegendItem[], width = 600): {top: number; right: number; bottom: number} {
  if (!(config.showLegend ?? true) || items.length === 0) return {top: 0, right: 0, bottom: 0};
  const l = config.legendLayout;
  if (l && (l.x != null || l.y != null)) return {top: 0, right: 0, bottom: 0};
  const pos = config.legendPosition ?? 'bottom';
  if (pos === 'right') return {top: 0, right: 118, bottom: 0};
  const fs = config.legendFont?.size ?? 10;
  const sw = Math.max(6, Math.round(fs));
  const overflow = config.legendFont?.overflow;
  const avail = Math.max(120, width - 24);
  const rows = wrapLegendItems(items, (it) => legendItemW(legendDisplay(it.label, 24, overflow), fs, sw), avail);
  const extra = (rows.length - 1) * (fs + 6);
  return pos === 'top' ? {top: 20 + extra, right: 0, bottom: 0} : {top: 0, right: 0, bottom: 16 + extra};
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
  const rowH = fs + 6;
  const family = config.legendFont?.fontFamily ?? st.fontFamily;
  const color = config.legendFont?.color ?? st.textColor;
  const weight = config.legendFont?.weight ?? 500;
  const align = config.legendFont?.align ?? 'center';
  const overflow = config.legendFont?.overflow;
  const labelOf = (s: string, max: number) => legendDisplay(s, max, overflow);
  const slotW = sw + LEGEND_PAD + LEGEND_ITEM_GAP;
  const slotFor = (it: LegendItem) => legendItemW(legendDisplay(it.label, 24, overflow), fs, sw);

  const layout = config.legendLayout;
  if (layout && (layout.x != null || layout.y != null)) {
    // Free placement via canvas offset coordinates (anchor/align/rotation).
    const anchor = layout.anchor ?? 'center';
    const refX = anchor === 'left' ? (layout.x ?? 0) : anchor === 'right' ? width - (layout.x ?? 0) : width / 2 + (layout.x ?? 0);
    const boxW = items.reduce((acc, it) => acc + slotFor(it), 0) - LEGEND_ITEM_GAP;
    const lAlign = layout.align ?? 'center';
    const startX = lAlign === 'left' ? refX : lAlign === 'right' ? refX - boxW : refX - boxW / 2;
    const baseY = layout.y ?? 0;
    const ls = layout.letterSpacing;
    return (
      <g
        fontFamily={family}
        opacity={layout.opacity ?? 1}
        transform={layout.rotation ? `rotate(${layout.rotation}, ${refX}, ${baseY})` : undefined}
      >
        {items.map((it, i) => {
          const x = startX + i * slotFor(it);
          return (
            <g key={it.label} transform={`translate(${x}, ${baseY})`}>
              <rect x={0} y={-sw / 2} width={sw} height={sw} fill={it.color} />
              <text x={sw + LEGEND_PAD} y={0} dominantBaseline="central" fontSize={fs} fill={color} fontWeight={weight} letterSpacing={ls}>{labelOf(it.label, 24)}</text>
            </g>
          );
        })}
      </g>
    );
  }

  if (position === 'right') {
    const x = width - 112;
    const maxRows = Math.max(1, Math.floor((height - headerOffset - 16) / rowH));
    let y = headerOffset + 10;
    return (
      <g fontFamily={family}>
        {items.slice(0, maxRows).map((it) => {
          const el = (
            <g key={it.label} transform={`translate(${x}, ${y})`}>
              <rect x={0} y={-sw / 2} width={sw} height={sw} fill={it.color} />
              <text x={sw + LEGEND_PAD} y={0} dominantBaseline="central" fontSize={fs} fill={color} fontWeight={weight}>{labelOf(it.label, 15)}</text>
            </g>
          );
          y += rowH;
          return el;
        })}
      </g>
    );
  }

  const avail = Math.max(120, width - 24);
  const rows = wrapLegendItems(items, slotFor, avail);
  const isTop = position === 'top';
  return (
    <g fontFamily={family}>
      {rows.map((row, ri) => {
        const boxW = row.reduce((acc, it) => acc + slotFor(it), 0) - LEGEND_ITEM_GAP;
        let x = align === 'left' ? 12 : align === 'right' ? Math.max(0, width - 12 - boxW) : Math.max(0, (width - boxW) / 2);
        const y = isTop ? headerOffset + 13 + ri * rowH : height - 8 - (rows.length - 1 - ri) * rowH;
        return (
          <g key={ri}>
            {row.map((it) => {
              const el = (
                <g key={it.label} transform={`translate(${x}, ${y})`}>
                  <rect x={0} y={-sw / 2} width={sw} height={sw} fill={it.color} />
                  <text x={sw + LEGEND_PAD} y={0} dominantBaseline="central" fontSize={fs} fill={color} fontWeight={weight}>{labelOf(it.label, 24)}</text>
                </g>
              );
              x += slotFor(it);
              return el;
            })}
          </g>
        );
      })}
    </g>
  );
}

// Estimated width of one rendered overlay line (SVG units), used for wrapping
// and the optional background box. 0.55·size per char matches the charts.
const overlayCharW = (s: string, fs: number) => s.length * fs * 0.55;

// Free-form overlays (text/image) drawn on top of the chart, above everything.
// Coordinates are in viewBox units from the top-left corner; text geometry
// reuses TextLayout so labels share the same anchor/rotation/background model
// as the titles. Insert inside the chart's SVG right before `</svg>`.
export function ChartOverlays({config, width, st}: {config: ChartConfig; width: number; st: ResolvedChartStyle}) {
  const overlays = config.overlays ?? [];
  if (overlays.length === 0) return null;
  return (
    <>
      {overlays.map((o) => {
        if (o.type === 'image') {
          const w = o.width ?? 0;
          const h = o.height ?? 0;
          const rot = o.rotation ?? 0;
          const cx = (o.x ?? 0) + w / 2;
          const cy = (o.y ?? 0) + h / 2;
          // Without a source yet, draw a dashed placeholder at the chosen
          // position/size so positioning is visible; it disappears once the
          // image URL is set. With no dimensions there is nothing to draw.
          if (!o.src || w <= 0 || h <= 0) {
            const x = o.x ?? 0;
            const y = o.y ?? 0;
            const rotate = rot ? `rotate(${rot} ${x} ${y})` : undefined;
            return (
              <g key={o.id} opacity={o.opacity ?? 1} transform={rotate}>
                <rect x={x} y={y} width={w} height={h} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 4" rx={4} />
                <text x={x + 6} y={y + h / 2} fontSize={11} fill="#f59e0b" dominantBaseline="central">
                  {o.src ? 'Cargando…' : 'Sin imagen'}
                </text>
              </g>
            );
          }
          return (
            <g key={o.id} opacity={o.opacity ?? 1}>
              <image
                href={o.src}
                x={o.x ?? 0}
                y={o.y ?? 0}
                width={w}
                height={h}
                preserveAspectRatio="xMidYMid meet"
                transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}
              />
            </g>
          );
        }

        const text = o.text ?? '';
        if (!text) return null;
        const layout = o.layout ?? {};
        const size = o.font?.size ?? 14;
        const weight = o.font?.weight ?? 400;
        const family = o.font?.fontFamily;
        const color = layout.color ?? o.font?.color ?? st.textColor;
        const align = o.font?.align ?? layout.align ?? 'left';
        const anchor = layout.anchor ?? 'left';
        const lineH = Math.max(size + 2, layout.lineHeight ?? size + 2);
        const maxW = o.maxWidth && o.maxWidth > 0 ? o.maxWidth : undefined;

        const lines: string[] = [];
        for (const raw of text.split('\n')) {
          if (!maxW) {
            lines.push(raw);
            continue;
          }
          const words = raw.split(/\s+/).filter(Boolean);
          let cur = '';
          for (const w of words) {
            const test = cur ? `${cur} ${w}` : w;
            if (cur && overlayCharW(test, size) > maxW) {
              lines.push(cur);
              cur = w;
            } else {
              cur = test;
            }
          }
          if (cur) lines.push(cur);
        }
        if (lines.length === 0) lines.push('');

        const x = layout.x ?? 0;
        const y = layout.y ?? 0;
        const textAnchor = align === 'right' ? 'end' : align === 'center' ? 'middle' : 'start';
        const xPos = anchor === 'right' ? width - x : anchor === 'center' ? width / 2 + x : x;

        const lineW = Math.max(...lines.map((l) => overlayCharW(l, size)));
        const pad = layout.bgPadding ?? 4;
        const boxW = lineW + pad * 2;
        const boxH = lines.length * lineH + pad * 2;
        const boxX = textAnchor === 'end' ? xPos - boxW : textAnchor === 'middle' ? xPos - boxW / 2 : xPos;
        const boxY = y - size - pad;

        const rot = layout.rotation ?? 0;
        const transform = rot ? `rotate(${rot} ${xPos} ${y})` : undefined;

        return (
          <g key={o.id} opacity={layout.opacity ?? 1} transform={transform} fontFamily={family}>
            {layout.bgColor && (
              <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={layout.bgRadius ?? 4} fill={layout.bgColor} opacity={layout.bgOpacity ?? 1} />
            )}
            {lines.map((ln, i) => (
              <text key={i} x={xPos} y={y + i * lineH} textAnchor={textAnchor} fontSize={size} fontWeight={weight} fill={color} letterSpacing={layout.letterSpacing}>
                {ln}
              </text>
            ))}
          </g>
        );
      })}
    </>
  );
}