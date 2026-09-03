'use client';

import {useState, type ReactNode} from 'react';
import type {ChartConfig, NumberFormat, TextOverflow, TextAlign, AvatarCrop} from '@/lib/chart-config';
import {prepareSeries, prepareMultiSeries, formatValue, colorFor, resolvedCategoryLabel, resolvedCategorySub, resolveChartStyle, resolveYDomain, type PreparedMultiSeries} from '@/lib/chart-data';
import {SvgHeader, SvgLegend, roundedRectPath, headerHeight, legendReserve, frameRect, Zone, legendItemsFrom, XAxisTitle, YAxisTitle, type LegendItem} from './chart-frame';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function BarChart({data, config}: Props) {
  // Multi-series (grouped/stacked) only when a series field is configured.
  // Otherwise fall back to the exact legacy single-series render.
  if (config.seriesField) {
    const multi = prepareMultiSeries(data, config);
    if (multi.series.length === 0 || multi.categories.length === 0) {
      return <div className="flex items-center justify-center h-48 text-muted text-sm">Sin datos para este gráfico</div>;
    }
    return <MultiBar multi={multi} config={config} />;
  }
  return <SingleBar data={data} config={config} />;
}

// --- Shared tooltip state + hover UI (Flourish-like) ---
type TooltipRow = {label: string; color: string; value: string};
type TooltipState = {
  x: number; // fractional position 0-1 within the SVG box
  y: number;
  title?: string;
  img?: string | null;
  rows: TooltipRow[];
};

function HoverTooltip({tip}: {tip: TooltipState | null}) {
  if (!tip || tip.rows.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-[110%] rounded-lg bg-black/90 border border-white/10 px-3 py-2 shadow-xl min-w-[9rem] backdrop-blur-sm"
      style={{left: `${tip.x * 100}%`, top: `${tip.y * 100}%`}}
    >
      {tip.img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tip.img} alt="" className="w-6 h-6 rounded-full object-cover mx-auto mb-1" referrerPolicy="no-referrer" />
      )}
      {tip.title && (
        <div className="text-[11px] font-semibold text-white mb-1 text-center">{tip.title}</div>
      )}
      <div className="space-y-0.5">
        {tip.rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-white/70">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{backgroundColor: r.color}} />
              {r.label}
            </span>
            <span className="text-white font-mono">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function hoverPos(e: React.MouseEvent<SVGElement>): {x: number; y: number} {
  const r = (e.currentTarget.ownerSVGElement as SVGSVGElement | null)?.getBoundingClientRect();
  if (!r) return {x: 0.5, y: 0.5};
  return {x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height};
}

// Module-level counter keeps SVG filter ids unique across charts on a page.
let svgNs = 0;

function barFill(color: string, config: ChartConfig, isNegative?: boolean): string {
  if (isNegative && config.negativeColor) return config.negativeColor;
  return color;
}

function referenceLinesSvg(
  multi: boolean,
  horizontal: boolean,
  domain: {yMin: number; yMax: number},
  yRange: number,
  marginAdj: {left: number; right: number; top: number; bottom: number},
  plotW: number,
  plotH: number,
  config: ChartConfig,
) {
  if (!config.referenceLines || config.referenceLines.length === 0) return null;
  void multi;
  return (
    <>
      {(config.referenceLines).map((rl, i) => {
        if (horizontal) {
          const x = marginAdj.left + ((rl.value - domain.yMin) / yRange) * plotW;
          if (x < marginAdj.left || x > widthOf(config)) return null;
          return (
            <g key={i}>
              <line x1={x} y1={marginAdj.top} x2={x} y2={marginAdj.top + plotH} stroke={rl.color ?? '#f59e0b'} strokeWidth={1.2} strokeDasharray={rl.dash ? '5 4' : undefined} />
              {rl.label && (
                <text x={x + 4} y={marginAdj.top + 10} fontSize={9} fill={rl.color ?? '#f59e0b'}>{rl.label}</text>
              )}
            </g>
          );
        }
        const y = marginAdj.top + plotH - ((rl.value - domain.yMin) / yRange) * plotH;
        if (y < marginAdj.top || y > marginAdj.top + plotH) return null;
        return (
          <g key={i}>
            <line x1={marginAdj.left} y1={y} x2={marginAdj.left + plotW} y2={y} stroke={rl.color ?? '#f59e0b'} strokeWidth={1.2} strokeDasharray={rl.dash ? '5 4' : undefined} />
            {rl.label && (
              <text x={marginAdj.left + plotW - 4} y={y - 4} textAnchor="end" fontSize={9} fill={rl.color ?? '#f59e0b'}>{rl.label}</text>
            )}
          </g>
        );
      })}
    </>
  );
}

function widthOf(config: ChartConfig): number {
  return config.width ?? 600;
}

function avatarUrlOf(avatarField: string | undefined, raw?: Record<string, unknown>): string | null {
  if (!avatarField) return null;
  const v = raw?.[avatarField];
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (t === '') return null;
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:image/') || t.startsWith('/')) return t;
  return null;
}

// Rough text width in SVG units, used to anchor avatars next to labels.
function estTextWidth(text: string, size: number): number {
  return Math.min(text.length, 16) * size * 0.58 + 2;
}

// Width estimate honoring the section's overflow setting, used to reserve
// canvas margins so out-of-plot labels/avatars are never clipped.
function estLabelWidth(text: string, size: number, overflow?: TextOverflow, cap = 16): number {
  const ov = overflow ?? 'truncate';
  const len = ov === 'none' ? text.length : Math.min(text.length, cap);
  return len * size * 0.58 + 2;
}

function descOfRow(descField: string | undefined, raw?: Record<string, unknown>): string | null {
  if (!descField) return null;
  const v = raw?.[descField];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function descOf(desc: string | null | undefined): string | null {
  if (!desc) return null;
  const s = String(desc).trim();
  return s ? s : null;
}

function wrapLines(text: string, maxLine: number, max: number): string[] {
  const chars = [...text];
  const lines: string[] = [];
  for (let i = 0; i < chars.length && lines.length < max; i += maxLine) {
    lines.push(chars.slice(i, i + maxLine).join(''));
  }
  return lines;
}

// Upper bound for 'wrap' overflow lines; reserves grow to fit so wrapped text
// is never clipped (unless it exceeds this cap, where it ellipsizes).
const MAX_WRAP_LINES = 4;

function estWrapLines(text: string, perLine: number): number {
  if (!text) return 0;
  return Math.min(MAX_WRAP_LINES, Math.max(1, Math.ceil(text.length / Math.max(perLine, 1))));
}

type FontLike = {size: number; color: string; family?: string; weight: number};

// Renders section text honoring its overflow setting: 'truncate' (ellipsis at
// `cap`), 'none' (full text), 'wrap' (multi-line tspans, best-effort when not
// rotated). Rotated labels always truncate to keep the layout legible.
// Maps a text-align to the SVG horizontal text anchor. Absent/auto falls back
// to 'middle' (preserving existing centered defaults where align is unset).
const anchorOf = (a?: TextAlign): 'start' | 'middle' | 'end' =>
  a === 'left' ? 'start' : a === 'right' ? 'end' : 'middle';

// Horizontal anchor for a label, honoring an explicit text-align override while
// preserving the positional anchor when align is unset (Auto).
const labelAnchor = (align: TextAlign | undefined, fallback: 'start' | 'middle' | 'end'): 'start' | 'middle' | 'end' =>
  align ? anchorOf(align) : fallback;

// Positions a category label within its column slot so alignment is meaningful
// (each label shifts inside its own band, never overlapping neighbours).
// 'Auto' preserves the positional center anchor.
function slotAlign(spanStart: number, spanEnd: number, fallback: 'start' | 'middle' | 'end', align?: TextAlign): {x: number; anchor: 'start' | 'middle' | 'end'} {
  if (!align) return {x: (spanStart + spanEnd) / 2, anchor: fallback};
  if (align === 'left') return {x: spanStart, anchor: 'start'};
  if (align === 'right') return {x: spanEnd, anchor: 'end'};
  return {x: (spanStart + spanEnd) / 2, anchor: 'middle'};
}

function catLabel(
  text: string,
  opts: {
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
    font: FontLike;
    overflow?: TextOverflow;
    rotate?: number;
    cap: number;
  },
): ReactNode {
  const ov = opts.overflow ?? 'truncate';
  const rot = opts.rotate !== undefined && opts.rotate !== 0;
  const base = {
    x: opts.x,
    y: opts.y,
    textAnchor: opts.anchor,
    fill: opts.font.color,
    fontSize: opts.font.size,
    fontFamily: opts.font.family,
    fontWeight: opts.font.weight,
  };
  const cut = (t: string) => (t.length > opts.cap ? t.slice(0, opts.cap) + '…' : t);
  if (rot) {
    return (
      <text {...base} transform={`rotate(${opts.rotate}, ${opts.x}, ${opts.y})`}>
        {cut(text)}
      </text>
    );
  }
  if (ov === 'none') return <text {...base}>{text}</text>;
  if (ov === 'truncate') return <text {...base}>{cut(text)}</text>;
  const lines = wrapLines(text, opts.cap, MAX_WRAP_LINES);
  if (lines.join('').length < text.length) lines[lines.length - 1] += '…';
  const lh = opts.font.size + 1.5;
  return (
    <text {...base}>
      {lines.map((ln, i) => (
        <tspan key={i} x={opts.x} dy={i === 0 ? 0 : lh}>{ln}</tspan>
      ))}
    </text>
  );
}

// Rounded-rect avatar radius defaults to a quarter of the size unless the user
// pinned an explicit radius; circles ignore the radius entirely.
function resolveAvatarRadius(config: ChartConfig, size: number): number {
  if (config.avatarRadius !== undefined) return config.avatarRadius;
  if ((config.avatarShape ?? 'rounded') === 'circle') return size / 2;
  return Math.min(Math.max(Math.round(size * 0.25), 4), 24);
}

// Avatar placement: global coordinates anchored to a FIXED point of the plot
// area per category (left edge at row center in horizontal; top edge at band
// center in vertical). The avatar center = (anchorX + offsetX, anchorY + offsetY).
// Decoupled from the bar: bar length/gap/spacing never move it, and its size/
// offset never reserves margins that shift the plot.
function avatarCx(tipX: number, offsetX: number): number {
  return tipX + offsetX;
}
function avatarCy(tipY: number, offsetY: number): number {
  return tipY + offsetY;
}

function Avatar({
  href, cx, cy, clipId, shape, size, radius, crop,
}: {
  href: string; cx: number; cy: number; clipId: string;
  shape: string | undefined; size: number; radius: number;
  crop?: AvatarCrop;
}) {
  // Zoom can go below 1 (zoom-out: image renders smaller than the frame,
  // revealing the frame around it). Minimum floor avoids 0; panning (focus) is
  // only meaningful while zoom > 1.
  const zoom = Math.max(crop?.zoom ?? 1, 0.1);
  const fx = Math.max(Math.min(crop?.focusX ?? 0, 1), -1);
  const fy = Math.max(Math.min(crop?.focusY ?? 0, 1), -1);
  const vw = size * zoom;
  const vh = size * zoom;
  const imgX = cx - vw / 2 + fx * (vw - size) / 2;
  const imgY = cy - vh / 2 + fy * (vh - size) / 2;
  const R = shape === 'circle' ? size / 2 : radius;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          {shape === 'circle' ? (
            <circle cx={cx} cy={cy} r={size / 2} />
          ) : (
            <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={radius} />
          )}
        </clipPath>
      </defs>
      <image
        href={href}
        x={imgX}
        y={imgY}
        width={vw}
        height={vh}
        preserveAspectRatio="xMidYMid meet"
        clipPath={`url(#${clipId})`}
      />
      {/* Subtle outline of the clip shape so the chosen forma stays legible even
          when the zoomed photo fills the frame. */}
      {shape === 'circle' ? (
        <circle cx={cx} cy={cy} r={size / 2} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={1} />
      ) : (
        <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={R} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={1} />
      )}
    </g>
  );
}

function MultiBar({multi, config}: {multi: PreparedMultiSeries; config: ChartConfig}) {
  const st = resolveChartStyle(config.style);
  const horizontal = config.horizontal ?? false;
  const stacked = (config.groupMode ?? 'grouped') === 'stacked' || !!config.stacked;
  const stackedPercent = config.groupMode === 'stacked-percent';
  const showLegend = config.showLegend ?? true;
  const legendPosition = config.legendPosition ?? 'bottom';
  const labelAngle = config.labelAngle ?? (multi.categories.length > 8 ? -30 : 0);

  const avatarField = config.avatarField;
  const avatarSize = config.avatarSize ?? 24;
  const avatarShape = config.avatarShape ?? 'rounded';
  const avatarRadius = resolveAvatarRadius(config, avatarSize);
  const avatarActive = !!avatarField;
  const avatarOffsetX = config.avatarOffsetX ?? 0;
  const avatarOffsetY = config.avatarOffsetY ?? 0;

  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const legendItems: LegendItem[] = legendItemsFrom(multi.series, config, (s) => s.name, (s) => s.color);
  const headerH = headerHeight(config, st, config.width ?? 600);
  const legendR = legendReserve(config, legendItems);
  const sp = config.spacing ?? {};
  const margin = {top: (sp.plotMarginTop ?? 24) + headerH + legendR.top + (sp.headerPadding ?? 0) + (sp.legendSpacing ?? 0), right: (sp.plotMarginRight ?? 40) + legendR.right + (sp.legendSpacing ?? 0), bottom: (sp.plotMarginBottom ?? 66) + legendR.bottom + (sp.legendSpacing ?? 0), left: (sp.plotMarginLeft ?? 84)};
  const nCat = multi.categories.length;
  const nS = multi.series.length;
  const maxVal = Math.max(multi.max, 0) || 1;
  const domain = stackedPercent
    ? {yMin: 0, yMax: 1, ticks: [0, 0.25, 0.5, 0.75, 1]}
    : resolveYDomain(0, maxVal, config);
  const yRange = stackedPercent ? 1 : Math.max(domain.yMax - domain.yMin, 0.001);
  const numFmt: NumberFormat = stackedPercent ? 'percent' : (config.numberFormat ?? 'short');
  const barGap = Math.max(config.barGap ?? 2, 0);
  const catGap = config.barCategoryGap ?? 0.15;
  const catColor = config.xLabelFont?.color ?? st.textColor;
  const catSize = config.xLabelFont?.size ?? st.labelFontSize;
  const catFamily = config.xLabelFont?.fontFamily ?? undefined;
  const catLabelOffX = config.categoryLabelOffsetX ?? 0;
  const catLabelOffY = config.categoryLabelOffsetY ?? 0;
  const catLabelsVisible = config.categoryLabelsVisible ?? true;
  const xAxisColor = config.xLabelFont?.color ?? st.axisColor;
  const yAxisColor = config.yLabelFont?.color ?? st.axisColor;
  const xAxisFamily = config.xLabelFont?.fontFamily;
  const yAxisFamily = config.yLabelFont?.fontFamily;
  const yTickFamily = config.yLabelFont?.fontFamily;
  const yTickSize = config.yLabelFont?.size ?? 10;
  const yTickColor = config.yLabelFont?.color ?? st.textColor;
  const yTickWeight = config.yLabelFont?.weight ?? 400;
  const catWeight = config.xLabelFont?.weight ?? 400;
  const radius = config.barRadius ?? 2;
  const descField = config.categoryDescriptionField;
  const descSize = config.categoryDescriptionFont?.size ?? Math.max(7, catSize - 3);
  const descOv = config.categoryDescriptionFont?.overflow;
  const catOv = config.xLabelFont?.overflow;
  const catFont: FontLike = {size: catSize, color: catColor, family: catFamily, weight: catWeight};
  const descFont: FontLike = {
    size: descSize,
    color: config.categoryDescriptionFont?.color ?? catColor,
    family: config.categoryDescriptionFont?.fontFamily ?? undefined,
    weight: config.categoryDescriptionFont?.weight ?? 400,
  };
  const catBlock = catLabelsVisible;
  const maxCat = multi.categories.reduce((m, c) => (c.length > m.length ? c : m), '');
  const maxDesc = descField
    ? multi.categoryDescriptions?.reduce<string>((m, d) => {
        const t = descOf(d);
        return t && t.length > m.length ? t : m;
      }, '') ?? ''
    : '';
  const borderW = config.barBorderWidth ?? 0;
  const borderColor = config.barBorderColor ?? '#ffffff';
  const dlPos = config.dataLabelPosition ?? 'auto';
  const dlFont = config.dataLabelFont;
  const dlSize = dlFont?.size ?? config.dataLabelFontSize ?? 10;
  const dlColor = dlFont?.color ?? config.dataLabelColor ?? '#ccc';
  const dlFamily = dlFont?.fontFamily ?? config.dataLabelFontFamily;
  const dlAlign = config.dataLabelFont?.align;
  const dlWeight = dlFont?.weight ?? 400;
  const tooltipEnabled = config.tooltipEnabled ?? true;

  const [tip, setTip] = useState<TooltipState | null>(null);
  const catTip = (ci: number, cat: string, frac: {x: number; y: number}): TooltipState => ({
    ...frac,
    title: resolvedCategoryLabel(config, cat),
    img: avatarActive ? (multi.categoryImages?.[ci] ?? null) : null,
    rows: multi.series.map((s) => ({label: s.name, color: s.color, value: formatValue(s.values[ci] ?? 0, numFmt)})),
  });

  const tickValues = domain.ticks;

  const totalLabel = (ci: number): number =>
    multi.series.reduce((a, s) => a + Math.max(s.values[ci] ?? 0, 0), 0);

  const stackBase = stacked || stackedPercent
    ? multi.categories.map((_, ci) => {
        const base: number[] = [];
        let acc = 0;
        for (const s of multi.series) {
          base.push(acc);
          acc += Math.max(s.values[ci] ?? 0, 0);
        }
        return base;
      })
    : null;

  const stackTotal = stackBase && multi.categories.map((_, ci) =>
    multi.series.reduce((a, s) => a + Math.max(s.values[ci] ?? 0, 0), 0),
  );

  // --- HORIZONTAL LAYOUT ---
  if (horizontal) {
    const marginAdj = {...margin};
    // Category labels are placed by absolute coordinates and no longer reserve
    // margins, so label size/offset never moves the plot. The plot left edge is
    // the fixed anchor for category labels on horizontal bars.
    const plotW = width - marginAdj.left - marginAdj.right;
    const plotH = height - marginAdj.top - marginAdj.bottom;
    const catBandH = plotH / Math.max(nCat, 1);
    const bandInset = catBandH * catGap;
    const barH = stacked || stackedPercent
      ? Math.max(catBandH * 0.7 - barGap * 2, 2)
      : Math.max(Math.min(catBandH * 0.7 / nS - barGap * 2, 30), 2);

    const stackXBase = stacked || stackedPercent
      ? multi.categories.map((_, ci) => {
          const base: number[] = [];
          let acc = 0;
          for (const s of multi.series) {
            base.push(acc);
            acc += Math.max(s.values[ci] ?? 0, 0);
          }
          return base;
        })
      : null;

    return (
      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
          {frameRect(config)}
          <Zone id="header">
            {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
            {showLegend && legendItems.length > 0 && <SvgLegend items={legendItems} position={legendPosition} width={width} height={height} st={st} config={config} headerOffset={headerH} />}
          </Zone>
          <Zone id="footer">
            {config.showGrid !== false && tickValues.map((v, i) => {
              const x = marginAdj.left + ((v - domain.yMin) / yRange) * plotW;
              return (
                <g key={i}>
                  {i > 0 && <line x1={x} y1={marginAdj.top} x2={x} y2={marginAdj.top + plotH} stroke={st.gridColor} strokeWidth={1} />}
                  <text x={x} y={marginAdj.top + plotH + 14} textAnchor="middle" fill={yTickColor} fontSize={yTickSize} fontFamily={yTickFamily} fontWeight={yTickWeight}>
                    {formatValue(v, numFmt)}
                  </text>
                </g>
              );
            })}
            {config.xLabel && (
              <XAxisTitle text={config.xLabel} width={width} height={height} color={xAxisColor} size={11} family={xAxisFamily} weight={config.xLabelFont?.weight ?? 400} align={config.xLabelFont?.align} />
            )}
          </Zone>
          <Zone id="left-axis">
            {config.yLabel && (
              <YAxisTitle text={config.yLabel} height={height} color={yAxisColor} size={11} family={yAxisFamily} weight={config.yLabelFont?.weight ?? 400} align={config.yLabelFont?.align} x={14} />
            )}
          </Zone>
          <Zone id="plot">
            {referenceLinesSvg(true, true, domain, yRange, marginAdj, plotW, plotH, config)}

              {multi.categories.map((cat, ci) => {
                const bandY = marginAdj.top + ci * catBandH;
                const cy = bandY + catBandH / 2;
                const total = stacked || stackedPercent ? totalLabel(ci) : 0;
                const leave = () => setTip(null);
                return (
                  <g
                    key={ci}
                    className={tooltipEnabled ? 'cursor-pointer' : undefined}
                    onMouseMove={tooltipEnabled ? (e) => { const p = hoverPos(e); setTip(catTip(ci, cat, p)); } : undefined}
                    onMouseLeave={tooltipEnabled ? leave : undefined}
                    fontFamily={dlFamily}
                    fontWeight={dlWeight}
                  >
                    {multi.series.map((s, si) => {
                      const val = s.values[ci] ?? 0;
                      let x: number;
                      let y: number;
                      let w: number;
                      let hh: number;
                      if (stacked || stackedPercent) {
                        const base = stackXBase![ci][si];
                        if (stackedPercent) {
                          const segTotal = stackTotal![ci] || 1;
                          const segW = (Math.max(val, 0) / segTotal) * plotW;
                          const baseW = (base / segTotal) * plotW;
                          x = marginAdj.left + baseW;
                          y = bandY + bandInset;
                          w = segW;
                        } else {
                          const baseW = (base / yRange) * plotW;
                          const bw = Math.max((Math.abs(val) / yRange) * plotW, 0);
                          x = marginAdj.left + baseW;
                          y = bandY + bandInset;
                          w = bw;
                        }
                        hh = barH;
                      } else {
                        const bw = Math.max((Math.abs(val) / yRange) * plotW, 0);
                        const offset = (catBandH - barH * nS) / 2;
                        x = marginAdj.left;
                        y = bandY + offset + si * (barH + barGap);
                        w = bw;
                        hh = barH;
                      }
                      const fill = barFill(s.color, config, val < 0);
                      const rectW = Math.max(w, 0);
                      const rEnds = !!config.barRadiusEndsOnly;
                      const visibleIdx = stacked || stackedPercent
                        ? multi.series.reduce<number[]>((acc, s2, si2) => ((s2.values[ci] ?? 0) > 0 ? [...acc, si2] : acc), [])
                        : [];
                      const firstVis = visibleIdx[0] ?? -1;
                      const lastVis = visibleIdx[visibleIdx.length - 1] ?? -1;
                      const corners = !rEnds || lastVis < 0
                        ? undefined
                        : !(stacked || stackedPercent)
                          ? (val > 0 ? {tr: true, br: true} : {})
                          : firstVis === lastVis
                            ? {tl: true, tr: true, bl: true, br: true}
                            : si === firstVis
                              ? {tl: true, bl: true}
                              : si === lastVis
                                ? {tr: true, br: true}
                                : {};
                      const hasCorners = !!corners && !!(corners.tl || corners.tr || corners.bl || corners.br);
                      return hasCorners ? (
                        <path
                          key={`${ci}-${si}`}
                          d={roundedRectPath(x, y, rectW, hh, radius, corners)}
                          fill={fill}
                          stroke={borderW > 0 ? borderColor : 'none'}
                          strokeWidth={borderW}
                          opacity={st.globalOpacity}
                        />
                      ) : (
                        <rect
                          key={`${ci}-${si}`}
                          x={x}
                          y={y}
                          width={rectW}
                          height={hh}
                          fill={fill}
                          rx={corners === undefined ? radius : 0}
                          stroke={borderW > 0 ? borderColor : 'none'}
                          strokeWidth={borderW}
                          opacity={st.globalOpacity}
                        />
                      );
                    })}
                    {config.showDataLabels !== false && stackedPercent && stackTotal && stackXBase && (
                      multi.series.map((s, si) => {
                        const val = Math.max(s.values[ci] ?? 0, 0);
                        const segTotal = stackTotal[ci] || 1;
                        const segW = (val / segTotal) * plotW;
                        if (segW < dlSize * 1.6 || val === 0) return null;
                        const segX = marginAdj.left + (stackXBase[ci][si] / segTotal) * plotW + segW / 2;
                        return (
                          <text key={`dl-${ci}-${si}`} x={segX} y={cy + 3} textAnchor={labelAnchor(dlAlign, 'middle')} fontSize={dlSize} fill="#fff" pointerEvents="none">
                            {formatValue(Math.round((val / segTotal) * 100 * 10) / 10 / 100, numFmt)}
                          </text>
                        );
                      })
                    )}
                    {config.showDataLabels !== false && !stackedPercent && (
                      stacked ? (
                        <text x={marginAdj.left + plotW - 4} y={cy + 3} textAnchor={labelAnchor(dlAlign, 'end')} fontSize={dlSize} fill={dlColor} pointerEvents="none">
                          {formatValue(total, numFmt)}
                        </text>
                      ) : (
                        multi.series.map((s, si) => {
                          const val = s.values[ci] ?? 0;
                          const bw = Math.max((Math.abs(val) / yRange) * plotW, 0);
                          const offset = (catBandH - barH * nS) / 2;
                          const y = bandY + offset + si * (barH + barGap) + barH / 2 + 3;
                          const endX = marginAdj.left + bw;
                          return (
                            <text key={`dl-${ci}-${si}`} x={endX + 6} y={y} textAnchor={labelAnchor(dlAlign, 'start')} fontSize={dlSize} fill={dlColor} pointerEvents="none">
                              {formatValue(val, numFmt)}
                            </text>
                          );
                        })
                      )
                    )}
                  </g>
                );
              })}
          </Zone>
          <Zone id="labels">
              {multi.categories.map((cat, ci) => {
                const bandY = marginAdj.top + ci * catBandH;
                const cy = bandY + catBandH / 2;
                const img = multi.categoryImages?.[ci] ?? null;
                const hasImg = avatarActive && !!img;
                const showText = catLabelsVisible;
                const label = resolvedCategoryLabel(config, cat);
                const desc = descOf(resolvedCategorySub(config, cat, multi.categoryDescriptions?.[ci]));
                const colStart = marginAdj.left;
                const colEnd = stacked || stackedPercent
                  ? marginAdj.left + ((stackedPercent ? 1 : (stackTotal![ci] || 1)) / (stackedPercent ? 1 : yRange)) * plotW
                  : marginAdj.left + (Math.max(...multi.series.map((s) => s.values[ci] ?? 0), 0) / yRange) * plotW;
                const midX = (colStart + colEnd) / 2;
                // Label anchored to a FIXED plot point at this category's slot:
                // horizontal → the plot left edge at the row center. Global X/Y
                // offsets shift it (Offset X: right = +, Offset Y: down = +).
                const labelAt = {x: marginAdj.left + catLabelOffX, y: cy + catLabelOffY, anchor: 'start' as const};
                const renderLabel = (p: {x: number; y: number; anchor: 'start' | 'middle' | 'end'} | null, focusCap = 16) => {
                  if (!p) return null;
                  return (
                    <g key={`lb-${ci}`}>
                      {catLabel(label, {...p, anchor: labelAnchor(config.xLabelFont?.align, p.anchor), font: catFont, overflow: catOv, cap: focusCap, rotate: labelAngle})}
                      {desc && catLabel(desc, {x: p.x, y: p.y + catSize + 2, anchor: labelAnchor(config.xLabelFont?.align, p.anchor), font: descFont, overflow: descOv, cap: 20})}
                    </g>
                  );
                };

                if (!hasImg) {
                  return showText ? renderLabel(labelAt) : null;
                }

                const crop = (config.avatarCrops ?? {})[cat];
                // Anchor DECOUPLED from the bar: a fixed point of the plot area at
                // the category's slot. Horizontal: the plot's left edge at the row
                // center. offsetX moves along the value axis (right = +), offsetY
                // moves down (SVG +). Bar length/gap never affect it.
                const ax = avatarCx(marginAdj.left, avatarOffsetX);
                const ay = avatarCy(cy, avatarOffsetY);
                return (
                  <g key={ci}>
                    <Avatar href={img!} cx={ax} cy={ay} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} crop={crop} />
                    {showText && renderLabel(labelAt)}
                  </g>
                );
              })}
          </Zone>
          </svg>
          {tooltipEnabled && <HoverTooltip tip={tip} />}
        </div>
    );
  }

  // --- VERTICAL LAYOUT (default) ---
  const marginAdj = {...margin};
  // Category labels / descriptions are placed by absolute coordinates and no
  // longer reserve right/bottom margins, so label size/offset/overflow never
  // move the plot. The plot bottom edge is the fixed anchor for category labels
  // on vertical bars.
  const plotW = width - marginAdj.left - marginAdj.right;
  const plotH = height - marginAdj.top - marginAdj.bottom;
  const catBand = (width - marginAdj.left - marginAdj.right) / Math.max(nCat, 1);
  const barBlockW = catBand * (1 - 2 * catGap);
  const barBandX = catBand * catGap;
  const barW = stacked || stackedPercent
    ? Math.max(barBlockW - barGap * 2, 2)
    : Math.max(Math.min(barBlockW / nS - barGap * 2, 46), 2);

  const stackH = (ci: number, si: number) => {
    const total = stackTotal![ci] || 1;
    return (Math.max(multi.series[si].values[ci] ?? 0, 0) / total) * plotH;
  };

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {frameRect(config)}
        <Zone id="header">
          {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
          {showLegend && legendItems.length > 0 && <SvgLegend items={legendItems} position={legendPosition} width={width} height={height} st={st} config={config} headerOffset={headerH} />}
        </Zone>
        <Zone id="left-axis">
            {config.showGrid !== false && tickValues.map((v, i) => {
              const y = marginAdj.top + plotH - ((v - domain.yMin) / yRange) * plotH;
              return (
                <g key={i}>
                  {i > 0 && <line x1={marginAdj.left} y1={y} x2={width - marginAdj.right} y2={y} stroke={st.gridColor} strokeWidth={1} />}
                  <text x={marginAdj.left - 8} y={y + 4} textAnchor="end" fill={yTickColor} fontSize={yTickSize} fontFamily={yTickFamily}>
                    {formatValue(v, numFmt)}
                  </text>
                </g>
              );
            })}
            {config.yLabel && (
              <YAxisTitle text={config.yLabel} height={height} color={yAxisColor} size={11} family={yAxisFamily} weight={config.yLabelFont?.weight ?? 400} align={config.yLabelFont?.align} x={16} />
            )}
        </Zone>
        <Zone id="plot">
            {referenceLinesSvg(true, false, domain, yRange, marginAdj, plotW, plotH, config)}
            {multi.categories.map((cat, ci) => {
              const bandX = marginAdj.left + ci * catBand;
              const total = stacked || stackedPercent ? totalLabel(ci) : 0;
              const leave = () => setTip(null);
              return (
<g
                key={ci}
                className={tooltipEnabled ? 'cursor-pointer' : undefined}
                onMouseMove={tooltipEnabled ? (e) => { const p = hoverPos(e); setTip(catTip(ci, cat, p)); } : undefined}
                onMouseLeave={tooltipEnabled ? leave : undefined}
                fontFamily={dlFamily}
                fontWeight={dlWeight}
              >
                {multi.series.map((s, si) => {
              const val = s.values[ci] ?? 0;
              let x: number;
              let y: number;
              let w: number;
              let hh: number;
              if (stacked || stackedPercent) {
                const base = stackBase![ci][si];
                if (stackedPercent) {
                  const segH = stackH(ci, si);
                  const baseH = (base / (stackTotal![ci] || 1)) * plotH;
                  x = bandX + barBandX;
                  y = marginAdj.top + plotH - baseH - segH;
                  hh = segH;
                } else {
                  const baseH = (base / yRange) * plotH;
                  const h = Math.max((Math.abs(val) / yRange) * plotH, 0);
                  x = bandX + barBandX;
                  y = marginAdj.top + plotH - baseH - h;
                  hh = h;
                }
                w = barBlockW;
              } else {
                const h = Math.max((Math.abs(val) / yRange) * plotH, 0);
                const offset = (catBand - barW * nS) / 2;
                x = bandX + offset + si * (barW + barGap);
                y = marginAdj.top + plotH - h;
                w = barW;
                hh = h;
              }
const fill = barFill(s.color, config, val < 0);
                const rectH = Math.max(hh, 0);
                const rEnds = !!config.barRadiusEndsOnly;
                const visibleIdx = stacked || stackedPercent
                  ? multi.series.reduce<number[]>((acc, s2, si2) => ((s2.values[ci] ?? 0) > 0 ? [...acc, si2] : acc), [])
                  : [];
                const firstVis = visibleIdx[0] ?? -1;
                const lastVis = visibleIdx[visibleIdx.length - 1] ?? -1;
                const corners = !rEnds || lastVis < 0
                  ? undefined
                  : !(stacked || stackedPercent)
                    ? (val > 0 ? {tl: true, tr: true} : {})
                    : firstVis === lastVis
                      ? {tl: true, tr: true, bl: true, br: true}
                      : si === firstVis
                        ? (val < 0 ? {tl: true, tr: true} : {bl: true, br: true})
                        : si === lastVis
                          ? (val < 0 ? {bl: true, br: true} : {tl: true, tr: true})
                          : {};
                const hasCorners = !!corners && !!(corners.tl || corners.tr || corners.bl || corners.br);
                return hasCorners ? (
                  <path
                    key={`${ci}-${si}`}
                    d={roundedRectPath(x, y, w, rectH, radius, corners)}
                    fill={fill}
                    stroke={borderW > 0 ? borderColor : 'none'}
                    strokeWidth={borderW}
                    opacity={st.globalOpacity}
                  />
                ) : (
                  <rect
                    key={`${ci}-${si}`}
                    x={x}
                    y={y}
                    width={Math.max(w, 0)}
                    height={rectH}
                    fill={fill}
                    rx={corners === undefined ? radius : 0}
                    stroke={borderW > 0 ? borderColor : 'none'}
                    strokeWidth={borderW}
                    opacity={st.globalOpacity}
                  />
                );
            })}
                {config.showDataLabels !== false && stackedPercent && stackTotal && stackBase && (
                  multi.series.map((s, si) => {
                    const val = Math.max(s.values[ci] ?? 0, 0);
                    const segTotal = stackTotal[ci] || 1;
                    const segH = (val / segTotal) * plotH;
                    if (segH < dlSize * 1.8 || val === 0) return null;
                    const segY = marginAdj.top + plotH - (stackBase[ci][si] / segTotal) * plotH - segH / 2;
                    const ds = slotAlign(bandX + barBandX, bandX + barBandX + barBlockW, 'middle', dlAlign);
                    return (
                      <text key={`dl-${ci}-${si}`} x={ds.x} y={segY + dlSize / 2} textAnchor={ds.anchor} fontSize={dlSize} fill="#fff" pointerEvents="none">
                        {formatValue(Math.round((val / segTotal) * 100 * 10) / 10 / 100, numFmt)}
                      </text>
                    );
                  })
                )}
                {config.showDataLabels !== false && !stackedPercent && (
                  stacked ? (
                    (() => {
                      const ds = slotAlign(bandX + barBandX, bandX + barBandX + barBlockW, 'middle', dlAlign);
                      return (
                        <text x={ds.x} y={marginAdj.top + plotH - (total / yRange) * plotH - 4} textAnchor={ds.anchor} fontSize={dlSize} fill={dlColor} pointerEvents="none">
                          {formatValue(total, numFmt)}
                        </text>
                      );
                    })()
                  ) : (
                    multi.series.map((s, si) => {
                      const val = s.values[ci] ?? 0;
                      const h = Math.max((Math.abs(val) / yRange) * plotH, 0);
                      const offset = (catBand - barW * nS) / 2;
                      const bx = bandX + offset + si * (barW + barGap);
                      const ds = slotAlign(bx, bx + barW, 'middle', dlAlign);
                      return (
                        <text key={`dl-${ci}-${si}`} x={ds.x} y={marginAdj.top + plotH - h - 5} textAnchor={ds.anchor} fontSize={dlSize} fill={dlColor} pointerEvents="none">
                          {formatValue(val, numFmt)}
                        </text>
                      );
                    })
                  )
                )}
              </g>
              );
            })}
        </Zone>
        <Zone id="footer">
            {config.xLabel && (
              <XAxisTitle text={config.xLabel} width={width} height={height} color={xAxisColor} size={11} family={xAxisFamily} weight={config.xLabelFont?.weight ?? 400} align={config.xLabelFont?.align} />
            )}
        </Zone>
        <Zone id="labels">
          {multi.categories.map((cat, ci) => {
            const bandX = marginAdj.left + ci * catBand;
            const blockCenterX = bandX + barBandX + barBlockW / 2;
            const img = multi.categoryImages?.[ci] ?? null;
            const hasImg = avatarActive && !!img;
            const showText = catLabelsVisible;
            const label = resolvedCategoryLabel(config, cat);
            const desc = descOf(resolvedCategorySub(config, cat, multi.categoryDescriptions?.[ci]));

            let barTop = marginAdj.top + plotH;
            if (hasImg) {
              // Anchor is always the VALUE TIP of the tallest bar in the category.
              if (stacked || stackedPercent) {
                barTop = stackedPercent
                  ? marginAdj.top
                  : marginAdj.top + plotH - ((multi.series.reduce((a, s) => a + Math.max(s.values[ci] ?? 0, 0), 0)) / yRange) * plotH;
              } else {
                const maxInCat = Math.max(...multi.series.map((s) => s.values[ci] ?? 0), 0);
                barTop = marginAdj.top + plotH - (maxInCat / yRange) * plotH;
              }
            }

            const renderLabel = (p: {x: number; y: number; anchor: 'start' | 'middle' | 'end'} | null, focusCap = 12) => {
              if (!p) return null;
              return (
                <g key={`lb-${ci}`}>
                  {catLabel(label, {...p, font: catFont, overflow: catOv, cap: focusCap, rotate: labelAngle})}
                  {desc && catLabel(desc, {x: p.x, y: p.y + catSize + 2, anchor: p.anchor, font: descFont, overflow: descOv, cap: 20})}
                </g>
              );
            };

            if (!hasImg) {
              const colBottom = marginAdj.top + plotH;
              const colTop = stackedPercent
                ? marginAdj.top
                : stacked
                  ? marginAdj.top + plotH - ((multi.series.reduce((a, s) => a + Math.max(s.values[ci] ?? 0, 0), 0)) / yRange) * plotH
                  : marginAdj.top + plotH - (Math.max(...multi.series.map((s) => s.values[ci] ?? 0), 0) / yRange) * plotH;
              const midY = (colTop + colBottom) / 2;
              // Label anchored to a FIXED plot point at this category's slot:
              // vertical → the plot bottom edge at the band center. Global X/Y
              // offsets shift it (Offset X: right = +, Offset Y: down = +).
              const labelAt = (() => {
                const slot = slotAlign(marginAdj.left + bandX, marginAdj.left + bandX + catBand, 'middle', config.xLabelFont?.align);
                return {x: slot.x + catLabelOffX, y: colBottom + catLabelOffY, anchor: slot.anchor};
              })();
              if (!showText || !labelAt) return null;
              return renderLabel(labelAt);
            }

            const axisY = height - marginAdj.bottom + 14;
            const crop = (config.avatarCrops ?? {})[cat];
            // Anchor DECOUPLED from the bar: the plot area's TOP edge at the
            // category band center. offsetX is perpendicular (left/right of the
            // band center), offsetY moves down along the value axis (SVG +).
            // Bar height/length and intra-category gap never affect it.
            const cx = avatarCx(bandX + catBand / 2, avatarOffsetX);
            const cy = avatarCy(marginAdj.top, avatarOffsetY);
            const avatarSlot = slotAlign(marginAdj.left + bandX, marginAdj.left + bandX + catBand, 'middle', config.xLabelFont?.align);
            return (
              <g key={ci}>
                <Avatar href={img!} cx={cx} cy={cy} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} crop={crop} />
                {showText && renderLabel({x: avatarSlot.x + catLabelOffX, y: marginAdj.top + plotH + catLabelOffY, anchor: avatarSlot.anchor}, 12)}
              </g>
            );
          })}
        </Zone>
        </svg>
        {tooltipEnabled && <HoverTooltip tip={tip} />}
    </div>
  );
}

function SingleBar({data, config}: Props) {
  const prepared = prepareSeries(data, config);
  const st = resolveChartStyle(config.style);
  const horizontal = config.horizontal ?? false;
  const numFmt = config.numberFormat ?? 'short';
  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const headerH = headerHeight(config, st, config.width ?? 600);
  const sp = config.spacing ?? {};
  const margin = {top: (sp.plotMarginTop ?? 24) + headerH + (sp.headerPadding ?? 0), right: (sp.plotMarginRight ?? 40), bottom: (sp.plotMarginBottom ?? 66), left: (sp.plotMarginLeft ?? 84)};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxVal = Math.max(prepared.max, 0) || 1;
  const catColor = config.xLabelFont?.color ?? st.textColor;
  const catSize = config.xLabelFont?.size ?? st.labelFontSize;
  const catFamily = config.xLabelFont?.fontFamily ?? undefined;
  const catLabelOffX = config.categoryLabelOffsetX ?? 0;
  const catLabelOffY = config.categoryLabelOffsetY ?? 0;
  const catLabelsVisible = config.categoryLabelsVisible ?? true;
  const xAxisColor = config.xLabelFont?.color ?? st.axisColor;
  const yAxisColor = config.yLabelFont?.color ?? st.axisColor;
  const xAxisFamily = config.xLabelFont?.fontFamily;
  const yAxisFamily = config.yLabelFont?.fontFamily;
  const domain = resolveYDomain(0, maxVal, config);
  const yRange = Math.max(domain.yMax - domain.yMin, 0.001);
  const n = prepared.items.length;

  // Avatars: enabled when a source image column is selected (single series).
  const avatarField = config.avatarField;
  const avatarActive = !!avatarField;
  const avatarSize = config.avatarSize ?? 24;
  const avatarShape = config.avatarShape ?? 'rounded';
  const avatarRadius = resolveAvatarRadius(config, avatarSize);
  const avatarOffsetX = config.avatarOffsetX ?? 0;
  const avatarOffsetY = config.avatarOffsetY ?? 0;

  const radius = config.barRadius ?? 2;
  const borderW = config.barBorderWidth ?? 0;
  const borderColor = config.barBorderColor ?? '#ffffff';
  const barGap = Math.max(config.barGap ?? 2, 0);
  const dlPos = config.dataLabelPosition ?? 'auto';
  const dlFont = config.dataLabelFont;
  const dlSize = dlFont?.size ?? config.dataLabelFontSize ?? 10;
  const dlColor = dlFont?.color ?? config.dataLabelColor ?? '#ccc';
  const dlFamily = dlFont?.fontFamily ?? config.dataLabelFontFamily;
  const dlAlign = config.dataLabelFont?.align;
  const dlWeight = dlFont?.weight ?? 400;
  const tooltipEnabled = config.tooltipEnabled ?? true;
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);
  const yTickFamily = config.yLabelFont?.fontFamily;
  const yTickSize = config.yLabelFont?.size ?? 10;
  const yTickColor = config.yLabelFont?.color ?? st.textColor;
  const yTickWeight = config.yLabelFont?.weight ?? 400;
  const catWeight = config.xLabelFont?.weight ?? 400;
  const catOv = config.xLabelFont?.overflow;
  const descField = config.categoryDescriptionField;
  const descSize = config.categoryDescriptionFont?.size ?? Math.max(7, catSize - 3);
  const descOv = config.categoryDescriptionFont?.overflow;
  const catFont: FontLike = {size: catSize, color: catColor, family: catFamily, weight: catWeight};
  const descFont: FontLike = {
    size: descSize,
    color: config.categoryDescriptionFont?.color ?? catColor,
    family: config.categoryDescriptionFont?.fontFamily ?? undefined,
    weight: config.categoryDescriptionFont?.weight ?? 400,
  };
  const marginAdj = {...margin};
  const [tip, setTip] = useState<TooltipState | null>(null);
  // Category labels / descriptions are placed by absolute coordinates and no
  // longer reserve margins, so label size/offset/overflow never move the plot.
  const plotW2 = width - marginAdj.left - marginAdj.right;
  const plotH2 = height - marginAdj.top - marginAdj.bottom;

  const avatarUrl = (raw?: Record<string, unknown>): string | null => avatarUrlOf(avatarField, raw);

  const itemTip = (d: (typeof prepared.items)[number], frac: {x: number; y: number}): TooltipState => ({
    ...frac,
    title: resolvedCategoryLabel(config, d.label),
    img: avatarActive ? avatarUrl(d.raw) : null,
    rows: [{label: 'Valor', color: colorFor(config, d.label, prepared.items.indexOf(d)), value: formatValue(d.value, numFmt)}],
  });

  if (horizontal) {
    const barH = Math.min(40, (plotH2 / n) * 0.7);
    const gap = (plotH2 - barH * n) / (n + 1);
    const tickValues = domain.ticks;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
          {frameRect(config)}
          <Zone id="header">
            {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
          </Zone>
          <Zone id="footer">
            {config.showGrid !== false && tickValues.map((v, i) => {
              const x = marginAdj.left + ((v - domain.yMin) / yRange) * plotW2;
              return (
                <g key={i}>
                  {i > 0 && <line x1={x} y1={marginAdj.top} x2={x} y2={marginAdj.top + plotH2} stroke={st.gridColor} strokeWidth={1} />}
                  <text x={x} y={marginAdj.top + plotH2 + 14} textAnchor="middle" fill={yTickColor} fontSize={yTickSize} fontFamily={yTickFamily} fontWeight={yTickWeight}>
                    {formatValue(v, numFmt)}
                  </text>
                </g>
              );
            })}
            {config.xLabel && <XAxisTitle text={config.xLabel} width={width} height={height} color={xAxisColor} size={11} family={xAxisFamily} weight={config.xLabelFont?.weight ?? 400} align={config.xLabelFont?.align} />}
          </Zone>
          <Zone id="left-axis">
            {config.yLabel && <YAxisTitle text={config.yLabel} height={height} color={yAxisColor} size={11} family={yAxisFamily} weight={config.yLabelFont?.weight ?? 400} align={config.yLabelFont?.align} x={14} />}
          </Zone>
          <Zone id="plot">
            {referenceLinesSvg(false, true, domain, yRange, marginAdj, plotW2, plotH2, config)}

          {prepared.items.map((d, i) => {
            const y = marginAdj.top + gap + i * (barH + gap);
            const barW = ((d.value - domain.yMin) / yRange) * plotW2;
            const bw = Math.max(barW, 0);
            const color = colorFor(config, d.label, i);
            const img = avatarUrl(d.raw);
            const endX = marginAdj.left + bw;
            const midX = (marginAdj.left + endX) / 2;
            const labelY = y + barH / 2 + 3;
            const showText = catLabelsVisible;
            // Label anchored to a FIXED plot point at this row: horizontal → the
            // plot left edge at the row center. Global X/Y offsets shift it.
            const labelAt = {x: marginAdj.left + catLabelOffX, y: labelY + catLabelOffY, anchor: 'start' as const};
            const labelExtra = avatarActive && !!img ? avatarSize + 10 : 6;
            const label = resolvedCategoryLabel(config, d.label);
            const desc = descOf(resolvedCategorySub(config, d.label, descOfRow(config.categoryDescriptionField, d.raw)));
            const renderLabel = (p: {x: number; y: number; anchor: 'start' | 'middle' | 'end'} | null) => {
              if (!p || !showText) return null;
              return (
                <g key={`lb-${i}`}>
                  {catLabel(label, {...p, anchor: labelAnchor(config.xLabelFont?.align, p.anchor), font: catFont, overflow: catOv, cap: 16, rotate: labelAngle})}
                  {desc && catLabel(desc, {x: p.x, y: p.y + catSize + 2, anchor: labelAnchor(config.xLabelFont?.align, p.anchor), font: descFont, overflow: descOv, cap: 20})}
                </g>
              );
            };

            let avatarNode: ReactNode = null;
            const crop = (config.avatarCrops ?? {})[d.label];
            if (img) {
              // Anchor DECOUPLED from the bar: the plot's left edge at the row
              // center. offsetX along the value axis (+ right), offsetY down (+).
              avatarNode = <Avatar href={img} cx={avatarCx(marginAdj.left, avatarOffsetX)} cy={avatarCy(labelY, avatarOffsetY)} clipId={`bh-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} crop={crop} />;
            }

            let catTextNode: ReactNode = null;
            if (showText && labelAt) {
              catTextNode = renderLabel(labelAt);
            }

            return (
              <g
                key={i}
                className={tooltipEnabled ? 'cursor-pointer' : undefined}
                onMouseMove={tooltipEnabled ? (e) => setTip(itemTip(d, hoverPos(e))) : undefined}
                onMouseLeave={tooltipEnabled ? () => setTip(null) : undefined}
                fontFamily={dlFamily}
                fontWeight={dlWeight}
              >
                {bw > 0 && (config.barRadiusEndsOnly ?? false) ? (
                  <path d={roundedRectPath(marginAdj.left, y, bw, barH, radius, {tr: true, br: true})} fill={barFill(color, config, d.value < 0)} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
                ) : (
                  <rect x={marginAdj.left} y={y} width={bw} height={barH} fill={barFill(color, config, d.value < 0)} rx={radius} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
                )}
                {config.showDataLabels !== false && dlPos === 'center' && (
                  <text x={marginAdj.left + bw / 2} y={labelY} textAnchor={labelAnchor(dlAlign, 'middle')} fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {config.showDataLabels !== false && dlPos === 'inside' && (
                  <text x={marginAdj.left + 8} y={labelY} textAnchor={labelAnchor(dlAlign, 'start')} fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {config.showDataLabels !== false && dlPos !== 'center' && dlPos !== 'inside' && (
                  <text x={endX + labelExtra} y={labelY} textAnchor={labelAnchor(dlAlign, 'start')} fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {avatarNode}
                {catTextNode}
              </g>
            );
          })}
          </Zone>
        </svg>
        {tooltipEnabled && <HoverTooltip tip={tip} />}
      </div>
    );
  }

  const barWidth = Math.min(60, (plotW2 / n) * 0.7);
  const gap = (plotW2 - barWidth * n) / (n + 1);

  const tickValues = domain.ticks;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {frameRect(config)}
        <Zone id="header">
          {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
        </Zone>
        <Zone id="left-axis">
          {config.showGrid !== false && tickValues.map((v, i) => {
            const y = marginAdj.top + plotH2 - ((v - domain.yMin) / yRange) * plotH2;
            return (
              <g key={i}>
                {i > 0 && <line x1={marginAdj.left} y1={y} x2={width - marginAdj.right} y2={y} stroke={st.gridColor} strokeWidth={1} />}
                <text x={marginAdj.left - 8} y={y + 4} textAnchor="end" fill={yTickColor} fontSize={yTickSize} fontFamily={yTickFamily} fontWeight={yTickWeight}>
                  {formatValue(v, numFmt)}
                </text>
              </g>
            );
          })}
          {config.yLabel && <YAxisTitle text={config.yLabel} height={height} color={yAxisColor} size={11} family={yAxisFamily} weight={config.yLabelFont?.weight ?? 400} align={config.yLabelFont?.align} x={16} />}
        </Zone>
        <Zone id="plot">
          {referenceLinesSvg(false, false, domain, yRange, marginAdj, plotW2, plotH2, config)}
          {prepared.items.map((d, i) => {
          const x = marginAdj.left + gap + i * (barWidth + gap);
          const barH = ((d.value - domain.yMin) / yRange) * plotH2;
          const color = colorFor(config, d.label, i);
          const img = avatarUrl(d.raw);
          const labelY = height - marginAdj.bottom + 14;
          const topY = marginAdj.top + plotH2 - barH;
          const barCenterY = topY + barH / 2;
          const colBottom = marginAdj.top + plotH2;
          const showText = catLabelsVisible;
          const centerX = x + barWidth / 2;
          // Label anchored to a FIXED plot point at this column: vertical → the
          // plot bottom edge at the column center. Global X/Y offsets shift it.
          const labelAt = (() => {
            const slot = slotAlign(x, x + barWidth, 'middle', config.xLabelFont?.align);
            return {x: slot.x + catLabelOffX, y: colBottom + catLabelOffY, anchor: slot.anchor};
          })();
          const label = resolvedCategoryLabel(config, d.label);
          const desc = descOf(resolvedCategorySub(config, d.label, descOfRow(config.categoryDescriptionField, d.raw)));
          const renderLabel = (p: {x: number; y: number; anchor: 'start' | 'middle' | 'end'} | null) => {
            if (!p || !showText) return null;
            return (
              <g key={`lb-${i}`}>
                {catLabel(label, {...p, font: catFont, overflow: catOv, cap: 12, rotate: labelAngle})}
                {desc && catLabel(desc, {x: p.x, y: p.y + catSize + 2, anchor: p.anchor, font: descFont, overflow: descOv, cap: 20})}
              </g>
            );
          };

          let avatarNode: ReactNode = null;
          const crop = (config.avatarCrops ?? {})[d.label];
          if (img) {
            // Anchor DECOUPLED from the bar: the plot area's TOP edge at the
            // column center. offsetX perpendicular, offsetY down along the value
            // axis (SVG +). Bar height never affects it.
            avatarNode = <Avatar href={img} cx={avatarCx(centerX, avatarOffsetX)} cy={avatarCy(marginAdj.top, avatarOffsetY)} clipId={`bv-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} crop={crop} />;
          }

          let catTextNode: ReactNode = null;
          if (showText && labelAt) {
            catTextNode = renderLabel(labelAt);
          }

          return (
<g
            key={i}
            className={tooltipEnabled ? 'cursor-pointer' : undefined}
            onMouseMove={tooltipEnabled ? (e) => setTip(itemTip(d, hoverPos(e))) : undefined}
            onMouseLeave={tooltipEnabled ? () => setTip(null) : undefined}
            fontFamily={dlFamily}
            fontWeight={dlWeight}
          >
              {barH > 0 && (config.barRadiusEndsOnly ?? false) ? (
                <path d={roundedRectPath(x, topY, barWidth, barH, radius, d.value < 0 ? {bl: true, br: true} : {tl: true, tr: true})} fill={barFill(color, config, d.value < 0)} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
              ) : (
                <rect x={x} y={topY} width={barWidth} height={Math.max(barH, 0)} fill={barFill(color, config, d.value < 0)} rx={radius} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
              )}
              {config.showDataLabels !== false && dlPos === 'center' && (
                <text x={centerX} y={barCenterY + 3} textAnchor={labelAnchor(dlAlign, 'middle')} fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {config.showDataLabels !== false && dlPos === 'inside' && (
                <text x={centerX} y={topY + dlSize + 2} textAnchor={labelAnchor(dlAlign, 'middle')} fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {config.showDataLabels !== false && dlPos !== 'center' && dlPos !== 'inside' && (
                <text x={centerX} y={topY - 6} textAnchor={labelAnchor(dlAlign, 'middle')} fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {avatarNode}
              {catTextNode}
            </g>
          );
        })}
        </Zone>
        <Zone id="footer">
          {config.xLabel && <XAxisTitle text={config.xLabel} width={width} height={height} color={xAxisColor} size={11} family={xAxisFamily} weight={config.xLabelFont?.weight ?? 400} align={config.xLabelFont?.align} />}
        </Zone>
      </svg>
      {tooltipEnabled && <HoverTooltip tip={tip} />}
    </div>
  );
}
