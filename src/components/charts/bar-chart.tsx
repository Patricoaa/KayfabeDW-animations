'use client';

import {useState, type ReactNode} from 'react';
import type {ChartConfig, NumberFormat, TextOverflow} from '@/lib/chart-config';
import {prepareSeries, prepareMultiSeries, formatValue, colorFor, resolveChartStyle, resolveYDomain, type PreparedMultiSeries} from '@/lib/chart-data';
import {SvgHeader, SvgLegend, roundedRectPath, headerHeight, legendReserve, frameRect, type LegendItem} from './chart-frame';

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

type FontLike = {size: number; color: string; family?: string; weight: number};

// Renders section text honoring its overflow setting: 'truncate' (ellipsis at
// `cap`), 'none' (full text), 'wrap' (multi-line tspans, best-effort when not
// rotated). Rotated labels always truncate to keep the layout legible.
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
  const lines = wrapLines(text, opts.cap, 2);
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

function Avatar({
  href, cx, cy, clipId, shape, size, radius,
}: {
  href: string; cx: number; cy: number; clipId: string;
  shape: string | undefined; size: number; radius: number;
}) {
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
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
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
  const avatarPos = config.avatarPosition ?? 'above';
  const avatarActive = !!avatarField;

  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const legendItems: LegendItem[] = multi.series.map((s) => ({label: s.name, color: s.color}));
  const headerH = headerHeight(config, st, config.width ?? 600);
  const legendR = legendReserve(config, legendItems);
  const margin = {top: 24 + headerH + legendR.top, right: 24 + legendR.right, bottom: 66 + legendR.bottom, left: 66};
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
  const catPos = config.categoryLabelPosition ?? 'axis';
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
  const catBlock = catPos !== 'hide';
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
  const dlSize = config.dataLabelFontSize ?? 10;
  const dlColor = config.dataLabelColor ?? '#ccc';
  const tooltipEnabled = config.tooltipEnabled ?? true;

  const [tip, setTip] = useState<TooltipState | null>(null);
  const catTip = (ci: number, cat: string, frac: {x: number; y: number}): TooltipState => ({
    ...frac,
    title: cat,
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
    if (avatarActive && avatarPos === 'bar-end') {
      marginAdj.right += avatarSize + 14;
    }
    if (avatarActive && avatarPos === 'above') {
      marginAdj.top += avatarSize + 10;
    }
    // Label-dependent avatars and long axis labels sit left of the bar row;
    // reserve the space so they are never clipped outside the SVG.
    const catEst = estLabelWidth(maxCat, catSize, catOv);
    const descEst = descField ? estLabelWidth(maxDesc, descSize, descOv) : 0;
    const labelEst = Math.max(catEst, descEst);
    if (avatarActive && (avatarPos === 'beside-label' || avatarPos === 'after-label') && catBlock) {
      marginAdj.left += labelEst + avatarSize + 16;
    } else if (catBlock && catPos === 'axis') {
      marginAdj.left += labelEst + 8;
    }
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
          {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
          {showLegend && legendItems.length > 0 && <SvgLegend items={legendItems} position={legendPosition} width={width} height={height} st={st} config={config} headerOffset={headerH} />}
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
              {referenceLinesSvg(true, true, domain, yRange, marginAdj, plotW, plotH, config)}

              {config.xLabel && (
                <text x={width / 2} y={height - 6} textAnchor="middle" fill={xAxisColor} fontSize={11} fontFamily={xAxisFamily} fontWeight={config.xLabelFont?.weight ?? 400}>{config.xLabel}</text>
              )}
              {config.yLabel && (
                <text x={14} y={height / 2} textAnchor="middle" fill={yAxisColor} fontSize={11} fontFamily={yAxisFamily} fontWeight={config.yLabelFont?.weight ?? 400} transform={`rotate(-90, 14, ${height / 2})`}>
                  {config.yLabel}
                </text>
              )}

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
                    fontFamily={config.dataLabelFontFamily ?? undefined}
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
                          <text key={`dl-${ci}-${si}`} x={segX} y={cy + 3} textAnchor="middle" fontSize={dlSize} fill="#fff" pointerEvents="none">
                            {formatValue(Math.round((val / segTotal) * 100 * 10) / 10 / 100, numFmt)}
                          </text>
                        );
                      })
                    )}
                    {config.showDataLabels !== false && !stackedPercent && (
                      stacked ? (
                        <text x={marginAdj.left + plotW - 4} y={cy + 3} textAnchor="end" fontSize={dlSize} fill={dlColor} pointerEvents="none">
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
                            <text key={`dl-${ci}-${si}`} x={endX + 6} y={y} textAnchor="start" fontSize={dlSize} fill={dlColor} pointerEvents="none">
                              {formatValue(val, numFmt)}
                            </text>
                          );
                        })
                      )
                    )}
                  </g>
                );
              })}

              {multi.categories.map((cat, ci) => {
                const bandY = marginAdj.top + ci * catBandH;
                const cy = bandY + catBandH / 2;
                const img = multi.categoryImages?.[ci] ?? null;
                const hasImg = avatarActive && !!img;
                const showText = catPos !== 'hide';
                const desc = descOf(multi.categoryDescriptions?.[ci]);
                const colStart = marginAdj.left;
                const colEnd = stacked || stackedPercent
                  ? marginAdj.left + ((stackedPercent ? 1 : (stackTotal![ci] || 1)) / (stackedPercent ? 1 : yRange)) * plotW
                  : marginAdj.left + (Math.max(...multi.series.map((s) => s.values[ci] ?? 0), 0) / yRange) * plotW;
                const midX = (colStart + colEnd) / 2;
                const rowY = cy + catBandH / 2 + 10;
                const labelAt = catPos === 'axis'
                  ? {x: colStart - 8, y: cy + 3, anchor: 'end' as const}
                  : catPos === 'start-out'
                    ? {x: colStart + 4, y: rowY, anchor: 'start' as const}
                    : catPos === 'end-out'
                      ? {x: colEnd, y: rowY, anchor: 'end' as const}
                      : catPos === 'center-out'
                        ? {x: midX, y: rowY, anchor: 'middle' as const}
                        : catPos === 'start-in'
                          ? {x: colStart + 8, y: cy + 3, anchor: 'start' as const}
                          : catPos === 'end-in'
                            ? {x: Math.max(colEnd - 8, colStart + 8), y: cy + 3, anchor: 'end' as const}
                            : {x: midX, y: cy + 3, anchor: 'middle' as const};
                const renderLabel = (p: {x: number; y: number; anchor: 'start' | 'middle' | 'end'} | null, focusCap = 16) => {
                  if (!p) return null;
                  return (
                    <g key={`lb-${ci}`}>
                      {catLabel(cat, {...p, font: catFont, overflow: catOv, cap: focusCap, rotate: labelAngle})}
                      {desc && catLabel(desc, {x: p.x, y: p.y + catSize + 2, anchor: p.anchor, font: descFont, overflow: descOv, cap: 20})}
                    </g>
                  );
                };

                if (!hasImg) {
                  return showText ? renderLabel(labelAt) : null;
                }

                if (avatarPos === 'bar-end') {
                  const total = stackXBase ? (stackTotal![ci] || 1) : yRange;
                  const barEndX = stacked || stackedPercent
                    ? marginAdj.left + ((stackXBase![ci][nS - 1] + Math.max(multi.series[nS - 1].values[ci] ?? 0, 0)) / total) * plotW
                    : colEnd;
                  return (
                    <g key={ci}>
                      <Avatar href={img!} cx={barEndX + (config.showDataLabels !== false ? 52 : 10) + avatarSize / 2} cy={cy} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                      {showText && renderLabel(labelAt)}
                    </g>
                  );
                }

                if (avatarPos === 'above') {
                  return (
                    <g key={ci}>
                      <Avatar href={img!} cx={midX} cy={bandY + bandInset - avatarSize / 2 - 4} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                      {showText && renderLabel(labelAt)}
                    </g>
                  );
                }

                // Label-dependent: 'beside-label' = icono a la izquierda del texto;
                // 'after-label' = icono a la derecha del texto (pegado al eje).
                if (showText) {
                  const labelX = avatarPos === 'beside-label'
                    ? colStart - 8 - estTextWidth(cat, catSize) - 6 - avatarSize
                    : colStart - 8 - avatarSize - 6;
                  const avatarCx = avatarPos === 'beside-label'
                    ? colStart - 8 - estTextWidth(cat, catSize) - 6 - avatarSize / 2
                    : colStart - 8 - avatarSize / 2;
                  return (
                    <g key={ci}>
                      <Avatar href={img!} cx={avatarCx} cy={cy} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                      {catLabel(cat, {x: labelX, y: cy + 3, anchor: 'end', font: catFont, overflow: catOv, cap: 12, rotate: labelAngle})}
                      {desc && catLabel(desc, {x: labelX, y: cy + 3 + catSize + 2, anchor: 'end', font: descFont, overflow: descOv, cap: 20})}
                    </g>
                  );
                }
                return (
                  <Avatar key={ci} href={img!} cx={colStart - 8 - avatarSize / 2} cy={cy} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                );
              })}
          </svg>
          {tooltipEnabled && <HoverTooltip tip={tip} />}
        </div>
    );
  }

  // --- VERTICAL LAYOUT (default) ---
  const marginAdj = {...margin};
  if (avatarActive && (avatarPos === 'above' || avatarPos === 'bar-end')) {
    marginAdj.top += avatarSize + 10;
  }
  // Beside/after-label avatars straddle the column edges; reserve a half
  // avatar on both sides so first/last columns never clip.
  if (avatarActive && (avatarPos === 'beside-label' || avatarPos === 'after-label') && catBlock) {
    marginAdj.left += avatarSize / 2 + 8;
    marginAdj.right += avatarSize / 2 + 8;
  }
  if (catBlock && catPos.endsWith('-out')) {
    const descEst = descField ? estLabelWidth(maxDesc, descSize, descOv) : 0;
    marginAdj.right += Math.max(estLabelWidth(maxCat, catSize, catOv), descEst) + 8;
  }
  // Descriptions render as extra small lines under the category label.
  if (descField && catBlock) {
    const descLines = descOv === 'wrap' ? 2 : 1;
    marginAdj.bottom += descLines * (descSize + 1.5) + 6;
  }
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
        {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
        {showLegend && legendItems.length > 0 && <SvgLegend items={legendItems} position={legendPosition} width={width} height={height} st={st} config={config} headerOffset={headerH} />}
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
            {referenceLinesSvg(true, false, domain, yRange, marginAdj, plotW, plotH, config)}

            {config.xLabel && (
              <text x={width / 2} y={height - 6} textAnchor="middle" fill={xAxisColor} fontSize={11} fontFamily={xAxisFamily} fontWeight={config.xLabelFont?.weight ?? 400}>{config.xLabel}</text>
            )}
            {config.yLabel && (
              <text x={16} y={height / 2} textAnchor="middle" fill={yAxisColor} fontSize={11} fontFamily={yAxisFamily} fontWeight={config.yLabelFont?.weight ?? 400} transform={`rotate(-90, 16, ${height / 2})`}>
                {config.yLabel}
              </text>
            )}

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
                fontFamily={config.dataLabelFontFamily ?? undefined}
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
                    return (
                      <text key={`dl-${ci}-${si}`} x={bandX + barBandX + barBlockW / 2} y={segY + dlSize / 2} textAnchor="middle" fontSize={dlSize} fill="#fff" pointerEvents="none">
                        {formatValue(Math.round((val / segTotal) * 100 * 10) / 10 / 100, numFmt)}
                      </text>
                    );
                  })
                )}
                {config.showDataLabels !== false && !stackedPercent && (
                  stacked ? (
                    <text x={bandX + barBandX + barBlockW / 2} y={marginAdj.top + plotH - (total / yRange) * plotH - 4} textAnchor="middle" fontSize={dlSize} fill={dlColor} pointerEvents="none">
                      {formatValue(total, numFmt)}
                    </text>
                  ) : (
                    multi.series.map((s, si) => {
                      const val = s.values[ci] ?? 0;
                      const h = Math.max((Math.abs(val) / yRange) * plotH, 0);
                      const offset = (catBand - barW * nS) / 2;
                      const bx = bandX + offset + si * (barW + barGap);
                      return (
                        <text key={`dl-${ci}-${si}`} x={bx + barW / 2} y={marginAdj.top + plotH - h - 5} textAnchor="middle" fontSize={dlSize} fill={dlColor} pointerEvents="none">
                          {formatValue(val, numFmt)}
                        </text>
                      );
                    })
                  )
                )}
              </g>
              );
            })}

          {multi.categories.map((cat, ci) => {
            const bandX = marginAdj.left + ci * catBand;
            const blockCenterX = bandX + barBandX + barBlockW / 2;
            const img = multi.categoryImages?.[ci] ?? null;
            const hasImg = avatarActive && !!img;
            const showText = catPos !== 'hide';
            const desc = descOf(multi.categoryDescriptions?.[ci]);

            let barTop = marginAdj.top + plotH;
            if (hasImg && (avatarPos === 'above' || avatarPos === 'bar-end')) {
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
                  {catLabel(cat, {...p, font: catFont, overflow: catOv, cap: focusCap, rotate: labelAngle})}
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
              const labelAt = catPos === 'hide'
                ? null
                : catPos === 'axis'
                  ? {x: blockCenterX, y: height - marginAdj.bottom + 14, anchor: 'middle' as const}
                  : catPos === 'start-out'
                    ? {x: blockCenterX + barBlockW / 2 + 8, y: colBottom - 4, anchor: 'start' as const}
                    : catPos === 'end-out'
                      ? {x: blockCenterX + barBlockW / 2 + 8, y: Math.max(colTop + 6, marginAdj.top + 8), anchor: 'start' as const}
                      : catPos === 'center-out'
                        ? {x: blockCenterX + barBlockW / 2 + 8, y: midY, anchor: 'start' as const}
                        : catPos === 'start-in'
                          ? {x: blockCenterX, y: colBottom - 10, anchor: 'middle' as const}
                          : catPos === 'end-in'
                            ? {x: blockCenterX, y: Math.min(colTop + 12, colBottom - 10), anchor: 'middle' as const}
                            : {x: blockCenterX, y: midY, anchor: 'middle' as const};
              if (!showText || !labelAt) return null;
              return renderLabel(labelAt);
            }

            const axisY = height - marginAdj.bottom + 14;

            if (avatarPos === 'above' || avatarPos === 'bar-end') {
              return (
                <g key={ci}>
                  <Avatar href={img!} cx={blockCenterX} cy={barTop - avatarSize / 2 - 4} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                  {showText && renderLabel({x: blockCenterX, y: axisY, anchor: 'middle'}, 12)}
                </g>
              );
            }

            if (avatarPos === 'beside-label' || avatarPos === 'after-label') {
              const beside = avatarPos === 'beside-label';
              const avatarCx = beside ? blockCenterX - avatarSize / 2 - 4 : blockCenterX + avatarSize / 2 + 4;
              if (showText) {
                const textX = beside ? blockCenterX + avatarSize / 2 + 4 : blockCenterX - avatarSize / 2 - 4;
                return (
                  <g key={ci}>
                    <Avatar href={img!} cx={avatarCx} cy={axisY} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                    {catLabel(cat, {x: textX, y: axisY, anchor: 'middle', font: catFont, overflow: catOv, cap: 12})}
                    {desc && catLabel(desc, {x: textX, y: axisY + catSize + 2, anchor: 'middle', font: descFont, overflow: descOv, cap: 20})}
                  </g>
                );
              }
              return (
                <Avatar key={ci} href={img!} cx={avatarCx} cy={axisY} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
              );
            }
            return (
              <Avatar key={ci} href={img!} cx={blockCenterX} cy={axisY} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
            );
          })}
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
  const margin = {top: 24 + headerH, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxVal = Math.max(prepared.max, 0) || 1;
  const catColor = config.xLabelFont?.color ?? st.textColor;
  const catSize = config.xLabelFont?.size ?? st.labelFontSize;
  const catFamily = config.xLabelFont?.fontFamily ?? undefined;
  const catPos = config.categoryLabelPosition ?? 'axis';
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
  const avatarPos = config.avatarPosition ?? 'above';

  const radius = config.barRadius ?? 2;
  const borderW = config.barBorderWidth ?? 0;
  const borderColor = config.barBorderColor ?? '#ffffff';
  const barGap = Math.max(config.barGap ?? 2, 0);
  const dlPos = config.dataLabelPosition ?? 'auto';
  const dlSize = config.dataLabelFontSize ?? 10;
  const dlColor = config.dataLabelColor ?? '#ccc';
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
  const catBlock = catPos !== 'hide';
  const maxLabel = prepared.items.reduce((m, it) => (it.label.length > m.length ? it.label : m), '');
  const maxDesc = descField
    ? prepared.items.reduce<string>((m, it) => {
        const t = descOfRow(descField, it.raw);
        return t && t.length > m.length ? t : m;
      }, '')
    : '';
  const [tip, setTip] = useState<TooltipState | null>(null);

  const marginAdj = {...margin};
  if (avatarActive) {
    if (!horizontal && (avatarPos === 'above' || avatarPos === 'bar-end')) marginAdj.top += avatarSize + 10;
    if (avatarActive && !horizontal && (avatarPos === 'beside-label' || avatarPos === 'after-label') && catBlock) {
      marginAdj.left += avatarSize / 2 + 8;
      marginAdj.right += avatarSize / 2 + 8;
    }
    if (horizontal && avatarPos === 'bar-end') marginAdj.right += avatarSize + 14;
    if (horizontal && avatarPos === 'above') marginAdj.top += avatarSize + 10;
  }
  // Reserve space for out-of-plot labels so they are never clipped.
  if (!horizontal && catBlock && catPos.endsWith('-out')) {
    const descEst = descField ? estLabelWidth(maxDesc, descSize, descOv) : 0;
    marginAdj.right += Math.max(estLabelWidth(maxLabel, catSize, catOv), descEst) + 8;
  }
  if (!horizontal && descField && catBlock) {
    const descLines = descOv === 'wrap' ? 2 : 1;
    marginAdj.bottom += descLines * (descSize + 1.5) + 6;
  }
  if (horizontal && catBlock) {
    const descEst = descField ? estLabelWidth(maxDesc, descSize, descOv) : 0;
    const labelEst = Math.max(estLabelWidth(maxLabel, catSize, catOv), descEst);
    if (avatarActive && (avatarPos === 'beside-label' || avatarPos === 'after-label')) {
      marginAdj.left += labelEst + avatarSize + 16;
    } else if (catPos === 'axis') {
      marginAdj.left += labelEst + 8;
    }
  }
  const plotW2 = width - marginAdj.left - marginAdj.right;
  const plotH2 = height - marginAdj.top - marginAdj.bottom;

  const avatarUrl = (raw?: Record<string, unknown>): string | null => avatarUrlOf(avatarField, raw);

  const itemTip = (d: (typeof prepared.items)[number], frac: {x: number; y: number}): TooltipState => ({
    ...frac,
    title: d.label,
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
          {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
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
          {referenceLinesSvg(false, true, domain, yRange, marginAdj, plotW2, plotH2, config)}

          {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={xAxisColor} fontSize={11} fontFamily={xAxisFamily} fontWeight={config.xLabelFont?.weight ?? 400}>{config.xLabel}</text>}
          {config.yLabel && <text x={14} y={height / 2} textAnchor="middle" fill={yAxisColor} fontSize={11} fontFamily={yAxisFamily} fontWeight={config.yLabelFont?.weight ?? 400} transform={`rotate(-90, 14, ${height / 2})`}>{config.yLabel}</text>}

          {prepared.items.map((d, i) => {
            const y = marginAdj.top + gap + i * (barH + gap);
            const barW = ((d.value - domain.yMin) / yRange) * plotW2;
            const bw = Math.max(barW, 0);
            const color = colorFor(config, d.label, i);
            const img = avatarUrl(d.raw);
            const endX = marginAdj.left + bw;
            const midX = (marginAdj.left + endX) / 2;
            const rowY = y + barH + 8;
            const labelY = y + barH / 2 + 3;
            const showText = catPos !== 'hide';
            const labelAt = catPos === 'hide'
              ? null
              : catPos === 'axis'
                ? {x: marginAdj.left - 8, y: labelY, anchor: 'end' as const}
                : catPos === 'start-out'
                  ? {x: marginAdj.left + 4, y: rowY, anchor: 'start' as const}
                  : catPos === 'end-out'
                    ? {x: endX, y: rowY, anchor: 'end' as const}
                    : catPos === 'center-out'
                      ? {x: midX, y: rowY, anchor: 'middle' as const}
                      : catPos === 'start-in'
                        ? {x: marginAdj.left + 8, y: labelY, anchor: 'start' as const}
                        : catPos === 'end-in'
                          ? {x: Math.max(endX - 8, marginAdj.left + 8), y: labelY, anchor: 'end' as const}
                          : {x: midX, y: labelY, anchor: 'middle' as const};
            const barEndAvatar = avatarActive && avatarPos === 'bar-end' && !!img;
            const labelExtra = barEndAvatar ? avatarSize + 10 : 6;
            const labelDependent = img && (avatarPos === 'beside-label' || avatarPos === 'after-label');
            const desc = descOfRow(config.categoryDescriptionField, d.raw);
            const renderLabel = (p: {x: number; y: number; anchor: 'start' | 'middle' | 'end'} | null) => {
              if (!p || !showText) return null;
              return (
                <g key={`lb-${i}`}>
                  {catLabel(d.label, {...p, font: catFont, overflow: catOv, cap: 16, rotate: labelAngle})}
                  {desc && catLabel(desc, {x: p.x, y: p.y + catSize + 2, anchor: p.anchor, font: descFont, overflow: descOv, cap: 20})}
                </g>
              );
            };

            let avatarNode: ReactNode = null;
            if (img && avatarPos === 'bar-end') {
              avatarNode = <Avatar href={img} cx={endX + labelExtra + avatarSize / 2} cy={labelY} clipId={`bh-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />;
            } else if (img && avatarPos === 'above') {
              avatarNode = <Avatar href={img} cx={midX} cy={y - avatarSize / 2 - 4} clipId={`bh-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />;
            } else if (img && avatarPos === 'beside-label') {
              avatarNode = <Avatar href={img} cx={marginAdj.left - 8 - estTextWidth(d.label, catSize) - 6 - avatarSize / 2} cy={labelY} clipId={`bh-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />;
            } else if (img && avatarPos === 'after-label') {
              avatarNode = <Avatar href={img} cx={marginAdj.left - 8 - avatarSize / 2} cy={labelY} clipId={`bh-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />;
            }

            let catTextNode: ReactNode = null;
            if (labelDependent) {
              if (showText) {
                const anchorEndX = avatarPos === 'beside-label'
                  ? marginAdj.left - 8
                  : marginAdj.left - 8 - avatarSize - 6;
                catTextNode = (
                  <g key={`lb-${i}`}>
                    {catLabel(d.label, {x: anchorEndX, y: labelY, anchor: 'end', font: catFont, overflow: catOv, cap: 16})}
                    {desc && catLabel(desc, {x: anchorEndX, y: labelY + catSize + 2, anchor: 'end', font: descFont, overflow: descOv, cap: 20})}
                  </g>
                );
              }
            } else if (showText && labelAt) {
              catTextNode = renderLabel(labelAt);
            }

            return (
              <g
                key={i}
                className={tooltipEnabled ? 'cursor-pointer' : undefined}
                onMouseMove={tooltipEnabled ? (e) => setTip(itemTip(d, hoverPos(e))) : undefined}
                onMouseLeave={tooltipEnabled ? () => setTip(null) : undefined}
                fontFamily={config.dataLabelFontFamily ?? undefined}
              >
                {bw > 0 && (config.barRadiusEndsOnly ?? false) ? (
                  <path d={roundedRectPath(marginAdj.left, y, bw, barH, radius, {tr: true, br: true})} fill={barFill(color, config, d.value < 0)} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
                ) : (
                  <rect x={marginAdj.left} y={y} width={bw} height={barH} fill={barFill(color, config, d.value < 0)} rx={radius} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
                )}
                {config.showDataLabels !== false && dlPos === 'center' && (
                  <text x={marginAdj.left + bw / 2} y={labelY} textAnchor="middle" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {config.showDataLabels !== false && dlPos === 'inside' && (
                  <text x={marginAdj.left + 8} y={labelY} textAnchor="start" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {config.showDataLabels !== false && dlPos !== 'center' && dlPos !== 'inside' && (
                  <text x={endX + labelExtra} y={labelY} textAnchor="start" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {avatarNode}
                {catTextNode}
              </g>
            );
          })}
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
        {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
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
        {referenceLinesSvg(false, false, domain, yRange, marginAdj, plotW2, plotH2, config)}

        {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={xAxisColor} fontSize={11} fontFamily={xAxisFamily} fontWeight={config.xLabelFont?.weight ?? 400}>{config.xLabel}</text>}
        {config.yLabel && <text x={16} y={height / 2} textAnchor="middle" fill={yAxisColor} fontSize={11} fontFamily={yAxisFamily} fontWeight={config.yLabelFont?.weight ?? 400} transform={`rotate(-90, 16, ${height / 2})`}>{config.yLabel}</text>}

        {prepared.items.map((d, i) => {
          const x = marginAdj.left + gap + i * (barWidth + gap);
          const barH = ((d.value - domain.yMin) / yRange) * plotH2;
          const color = colorFor(config, d.label, i);
          const img = avatarUrl(d.raw);
          const labelY = height - marginAdj.bottom + 14;
          const topY = marginAdj.top + plotH2 - barH;
          const barCenterY = topY + barH / 2;
          const colBottom = marginAdj.top + plotH2;
          const showText = catPos !== 'hide';
          const labelAt = catPos === 'hide'
            ? null
            : catPos === 'axis'
              ? {x: x + barWidth / 2, y: labelY, anchor: 'middle' as const}
              : catPos === 'start-out'
                ? {x: x + barWidth + 8, y: colBottom - 4, anchor: 'start' as const}
                : catPos === 'end-out'
                  ? {x: x + barWidth + 8, y: Math.max(topY + 6, marginAdj.top + 8), anchor: 'start' as const}
                  : catPos === 'center-out'
                    ? {x: x + barWidth + 8, y: barCenterY, anchor: 'start' as const}
                    : catPos === 'start-in'
                      ? {x: x + barWidth / 2, y: Math.max(colBottom - 10, topY + 10), anchor: 'middle' as const}
                      : catPos === 'end-in'
                        ? {x: x + barWidth / 2, y: Math.min(topY + 12, colBottom - 10), anchor: 'middle' as const}
                        : {x: x + barWidth / 2, y: barCenterY, anchor: 'middle' as const};
          const centerX = x + barWidth / 2;
          const desc = descOfRow(config.categoryDescriptionField, d.raw);
          const renderLabel = (p: {x: number; y: number; anchor: 'start' | 'middle' | 'end'} | null) => {
            if (!p || !showText) return null;
            return (
              <g key={`lb-${i}`}>
                {catLabel(d.label, {...p, font: catFont, overflow: catOv, cap: 12, rotate: labelAngle})}
                {desc && catLabel(desc, {x: p.x, y: p.y + catSize + 2, anchor: p.anchor, font: descFont, overflow: descOv, cap: 20})}
              </g>
            );
          };

          let avatarNode: ReactNode = null;
          if (img && (avatarPos === 'above' || avatarPos === 'bar-end')) {
            avatarNode = <Avatar href={img} cx={centerX} cy={topY - (config.showDataLabels !== false ? 6 + avatarSize / 2 : avatarSize / 2)} clipId={`bv-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />;
          } else if (img && avatarPos === 'beside-label') {
            avatarNode = <Avatar href={img} cx={centerX - avatarSize / 2 - 6} cy={labelY} clipId={`bv-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />;
          } else if (img && avatarPos === 'after-label') {
            avatarNode = <Avatar href={img} cx={centerX + avatarSize / 2 + 6} cy={labelY} clipId={`bv-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />;
          }

          let catTextNode: ReactNode = null;
          if (img && (avatarPos === 'beside-label' || avatarPos === 'after-label')) {
            if (showText) {
              const beside = avatarPos === 'beside-label';
              const textX = beside ? centerX + avatarSize / 2 + 6 : centerX - avatarSize / 2 - 6;
              catTextNode = (
                <g key={`lb-${i}`}>
                  {catLabel(d.label, {x: textX, y: labelY, anchor: 'middle', font: catFont, overflow: catOv, cap: 12})}
                  {desc && catLabel(desc, {x: textX, y: labelY + catSize + 2, anchor: 'middle', font: descFont, overflow: descOv, cap: 20})}
                </g>
              );
            }
          } else if (showText && labelAt) {
            catTextNode = renderLabel(labelAt);
          }

          return (
<g
            key={i}
            className={tooltipEnabled ? 'cursor-pointer' : undefined}
            onMouseMove={tooltipEnabled ? (e) => setTip(itemTip(d, hoverPos(e))) : undefined}
            onMouseLeave={tooltipEnabled ? () => setTip(null) : undefined}
            fontFamily={config.dataLabelFontFamily ?? undefined}
          >
              {barH > 0 && (config.barRadiusEndsOnly ?? false) ? (
                <path d={roundedRectPath(x, topY, barWidth, barH, radius, d.value < 0 ? {bl: true, br: true} : {tl: true, tr: true})} fill={barFill(color, config, d.value < 0)} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
              ) : (
                <rect x={x} y={topY} width={barWidth} height={Math.max(barH, 0)} fill={barFill(color, config, d.value < 0)} rx={radius} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
              )}
              {config.showDataLabels !== false && dlPos === 'center' && (
                <text x={centerX} y={barCenterY + 3} textAnchor="middle" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {config.showDataLabels !== false && dlPos === 'inside' && (
                <text x={centerX} y={topY + dlSize + 2} textAnchor="middle" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {config.showDataLabels !== false && dlPos !== 'center' && dlPos !== 'inside' && (
                <text x={centerX} y={topY - 6} textAnchor="middle" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {avatarNode}
              {catTextNode}
            </g>
          );
        })}
      </svg>
      {tooltipEnabled && <HoverTooltip tip={tip} />}
    </div>
  );
}
