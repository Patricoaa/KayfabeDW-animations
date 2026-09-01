'use client';

import {useState} from 'react';
import type {ChartConfig, NumberFormat} from '@/lib/chart-config';
import {prepareSeries, prepareMultiSeries, formatValue, pickColor, resolveChartStyle, resolveYDomain, type PreparedMultiSeries} from '@/lib/chart-data';
import {Legend} from './legend';

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

// Module-level counter keeps SVG gradient/filter ids unique across charts on a page.
let svgNs = 0;

function barFill(color: string, config: ChartConfig, gradId: string | null, isNegative?: boolean): string {
  if (isNegative && config.negativeColor) return config.negativeColor;
  if (config.barGradient && gradId) return `url(#${gradId})`;
  return color;
}

function frameRect(config: ChartConfig, shadowId?: string) {
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
      filter={config.canvasShadow ? `url(#${shadowId})` : undefined}
    />
  );
}

function frameFilter(shadowId: string, enabled: boolean) {
  if (!enabled) return null;
  return (
    <filter id={shadowId} x="-5%" y="-5%" width="115%" height="115%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000000" floodOpacity="0.35" />
    </filter>
  );
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
  const avatarShape = config.avatarShape ?? 'circle';
  const avatarRadius = config.avatarRadius ?? 6;
  const avatarPos = config.avatarPosition ?? 'above';
  const avatarActive = !!avatarField;

  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
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
  const radius = config.barRadius ?? 2;
  const borderW = config.barBorderWidth ?? 0;
  const borderColor = config.barBorderColor ?? '#ffffff';
  const dlPos = config.dataLabelPosition ?? 'auto';
  const dlSize = config.dataLabelFontSize ?? 10;
  const dlColor = config.dataLabelColor ?? '#ccc';
  const tooltipEnabled = config.tooltipEnabled ?? true;
  const shadowId = `f-${svgNs++}`;
  const gradId = config.barGradient ? `bg-${svgNs++}` : null;
  const gradProps = horizontal ? {x1: '0%', y1: '0%', x2: '100%', y2: '0%'} : {x1: '0%', y1: '0%', x2: '0%', y2: '100%'};

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
      <div className="flex flex-col gap-2">
        {showLegend && legendPosition === 'top' && (
          <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="top" />
        )}
        <div className="flex gap-2">
          {showLegend && legendPosition === 'right' && (
            <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="right" />
          )}
          <div className="relative flex-1 min-w-0">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
              <defs>
                {config.barGradient && gradId && (
                  <linearGradient id={gradId} {...gradProps}>
                    <stop offset="0%" stopColor={config.barGradient.from} />
                    <stop offset="100%" stopColor={config.barGradient.to} />
                  </linearGradient>
                )}
                {frameFilter(shadowId, config.canvasShadow ?? false)}
              </defs>
              {frameRect(config, shadowId)}
              {config.showGrid !== false && tickValues.map((v, i) => {
                const x = marginAdj.left + ((v - domain.yMin) / yRange) * plotW;
                return (
                  <g key={i}>
                    {i > 0 && <line x1={x} y1={marginAdj.top} x2={x} y2={marginAdj.top + plotH} stroke={st.gridColor} strokeWidth={1} />}
                    <text x={x} y={marginAdj.top + plotH + 14} textAnchor="middle" fill={st.textColor} fontSize={10}>
                      {formatValue(v, numFmt)}
                    </text>
                  </g>
                );
              })}
              {referenceLinesSvg(true, true, domain, yRange, marginAdj, plotW, plotH, config)}

              {config.xLabel && (
                <text x={width / 2} y={height - 6} textAnchor="middle" fill={st.axisColor} fontSize={11}>{config.xLabel}</text>
              )}
              {config.yLabel && (
                <text x={14} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 14, ${height / 2})`}>
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
                      const fill = barFill(s.color, config, gradId, val < 0);
                      return (
                        <rect
                          key={`${ci}-${si}`}
                          x={x}
                          y={y}
                          width={Math.max(w, 0)}
                          height={hh}
                          fill={fill}
                          rx={radius}
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

              if (!hasImg) {
                return (
                  <text
                    key={ci}
                    x={marginAdj.left - 8}
                    y={cy + 3}
                    textAnchor="end"
                    fill={st.textColor}
                    fontSize={st.labelFontSize}
                  >
                    {cat.length > 16 ? cat.slice(0, 16) + '…' : cat}
                  </text>
                );
              }

              if (avatarPos === 'bar-end') {
                const total = stackXBase ? (stackTotal![ci] || 1) : yRange;
                const barEndX = stacked || stackedPercent
                  ? marginAdj.left + ((stackXBase![ci][nS - 1] + Math.max(multi.series[nS - 1].values[ci] ?? 0, 0)) / total) * plotW
                  : marginAdj.left + (Math.max(...multi.series.map((s) => s.values[ci] ?? 0), 0) / yRange) * plotW;
                return (
                  <g key={ci}>
                    <text x={marginAdj.left - 8} y={cy + 3} textAnchor="end" fill={st.textColor} fontSize={st.labelFontSize}>
                      {cat.length > 16 ? cat.slice(0, 16) + '…' : cat}
                    </text>
                    <Avatar href={img!} cx={barEndX + (config.showDataLabels !== false ? 52 : 10) + avatarSize / 2} cy={cy} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                  </g>
                );
              }

              if (avatarPos === 'replace-label') {
                return (
                  <Avatar key={ci} href={img!} cx={marginAdj.left - 8 - avatarSize / 2} cy={cy} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                );
              }

              // Default: 'beside-label' / 'above'
              return (
                <g key={ci}>
                  <Avatar href={img!} cx={marginAdj.left - 8 - avatarSize / 2} cy={cy} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                  <text x={marginAdj.left - 8 - avatarSize - 6} y={cy + 3} textAnchor="end" fill={st.textColor} fontSize={st.labelFontSize}>
                    {cat.length > 12 ? cat.slice(0, 12) + '…' : cat}
                  </text>
                </g>
              );
            })}
          </svg>
          {tooltipEnabled && <HoverTooltip tip={tip} />}
        </div>
        </div>
        {showLegend && legendPosition === 'bottom' && (
          <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="bottom" />
        )}
      </div>
    );
  }

  // --- VERTICAL LAYOUT (default) ---
  const marginAdj = {...margin};
  if (avatarActive && avatarPos === 'above' && labelAngle === 0) {
    marginAdj.top += avatarSize + 10;
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
    <div className="flex flex-col gap-2">
      {showLegend && legendPosition === 'top' && (
        <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="top" />
      )}
      <div className="flex gap-2">
        {showLegend && legendPosition === 'right' && (
          <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="right" />
        )}
        <div className="relative flex-1 min-w-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
            <defs>
              {config.barGradient && gradId && (
                <linearGradient id={gradId} {...gradProps}>
                  <stop offset="0%" stopColor={config.barGradient.from} />
                  <stop offset="100%" stopColor={config.barGradient.to} />
                </linearGradient>
              )}
              {frameFilter(shadowId, config.canvasShadow ?? false)}
            </defs>
            {frameRect(config, shadowId)}
            {config.showGrid !== false && tickValues.map((v, i) => {
              const y = marginAdj.top + plotH - ((v - domain.yMin) / yRange) * plotH;
              return (
                <g key={i}>
                  {i > 0 && <line x1={marginAdj.left} y1={y} x2={width - marginAdj.right} y2={y} stroke={st.gridColor} strokeWidth={1} />}
                  <text x={marginAdj.left - 8} y={y + 4} textAnchor="end" fill={st.textColor} fontSize={10}>
                    {formatValue(v, numFmt)}
                  </text>
                </g>
              );
            })}
            {referenceLinesSvg(true, false, domain, yRange, marginAdj, plotW, plotH, config)}

            {config.xLabel && (
              <text x={width / 2} y={height - 6} textAnchor="middle" fill={st.axisColor} fontSize={11}>{config.xLabel}</text>
            )}
            {config.yLabel && (
              <text x={16} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 16, ${height / 2})`}>
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
              const fill = barFill(s.color, config, gradId, val < 0);
              return (
                <rect
                  key={`${ci}-${si}`}
                  x={x}
                  y={y}
                  width={Math.max(w, 0)}
                  height={Math.max(hh, 0)}
                  fill={fill}
                  rx={radius}
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
            const cx = bandX + catBand / 2;
            const img = multi.categoryImages?.[ci] ?? null;
            const hasImg = avatarActive && !!img && labelAngle === 0;

            let barTop = marginAdj.top + plotH;
            if (hasImg && avatarPos === 'above') {
              if (stacked || stackedPercent) {
                barTop = stackedPercent
                  ? marginAdj.top
                  : marginAdj.top + plotH - ((multi.series.reduce((a, s) => a + Math.max(s.values[ci] ?? 0, 0), 0)) / yRange) * plotH;
              } else {
                const maxInCat = Math.max(...multi.series.map((s) => s.values[ci] ?? 0), 0);
                barTop = marginAdj.top + plotH - (maxInCat / yRange) * plotH;
              }
            }

            if (!hasImg) {
              return (
                <text
                  key={ci}
                  x={cx}
                  y={height - marginAdj.bottom + 14}
                  textAnchor="middle"
                  fill={st.textColor}
                  fontSize={st.labelFontSize}
                >
                  {cat.length > 12 ? cat.slice(0, 12) + '…' : cat}
                </text>
              );
            }

            if (avatarPos === 'above') {
              return (
                <g key={ci}>
                  <Avatar href={img!} cx={cx} cy={barTop - avatarSize / 2 - 4} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                  <text x={cx} y={height - marginAdj.bottom + 14} textAnchor="middle" fill={st.textColor} fontSize={st.labelFontSize}>
                    {cat.length > 12 ? cat.slice(0, 12) + '…' : cat}
                  </text>
                </g>
              );
            }

            if (avatarPos === 'replace-label') {
              return (
                <Avatar key={ci} href={img!} cx={cx} cy={height - marginAdj.bottom + 14} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
              );
            }

            const labelX = cx + avatarSize / 2 + 4;
            return (
              <g key={ci}>
                <Avatar href={img!} cx={cx - avatarSize / 2 - 4} cy={height - marginAdj.bottom + 14} clipId={`mb-av-${ci}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                <text
                  x={labelX}
                  y={height - marginAdj.bottom + 14}
                  textAnchor="middle"
                  fill={st.textColor}
                  fontSize={st.labelFontSize}
                >
                  {cat.length > 12 ? cat.slice(0, 12) + '…' : cat}
                </text>
              </g>
            );
          })}
        </svg>
        {tooltipEnabled && <HoverTooltip tip={tip} />}
        </div>
      </div>
      {showLegend && legendPosition === 'bottom' && (
        <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="bottom" />
      )}
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
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxVal = Math.max(prepared.max, 0) || 1;
  const domain = resolveYDomain(0, maxVal, config);
  const yRange = Math.max(domain.yMax - domain.yMin, 0.001);
  const n = prepared.items.length;

  // Avatars: enabled when a source image column is selected (single series).
  const avatarField = config.avatarField;
  const avatarActive = !!avatarField;
  const avatarSize = config.avatarSize ?? 24;
  const avatarShape = config.avatarShape ?? 'circle';
  const avatarRadius = config.avatarRadius ?? 6;
  const avatarPos = config.avatarPosition ?? 'above';

  const radius = config.barRadius ?? 2;
  const borderW = config.barBorderWidth ?? 0;
  const borderColor = config.barBorderColor ?? '#ffffff';
  const barGap = Math.max(config.barGap ?? 2, 0);
  const dlPos = config.dataLabelPosition ?? 'auto';
  const dlSize = config.dataLabelFontSize ?? 10;
  const dlColor = config.dataLabelColor ?? '#ccc';
  const tooltipEnabled = config.tooltipEnabled ?? true;
  const shadowId = `f-${svgNs++}`;
  const gradId = config.barGradient ? `bg-${svgNs++}` : null;
  const gradProps = horizontal ? {x1: '0%', y1: '0%', x2: '100%', y2: '0%'} : {x1: '0%', y1: '0%', x2: '0%', y2: '100%'};
  const [tip, setTip] = useState<TooltipState | null>(null);

  const marginAdj = {...margin};
  if (avatarActive) {
    if (!horizontal && avatarPos === 'above') marginAdj.top += avatarSize + 10;
    if (horizontal && avatarPos === 'bar-end') marginAdj.right += avatarSize + 14;
  }
  const plotW2 = width - marginAdj.left - marginAdj.right;
  const plotH2 = height - marginAdj.top - marginAdj.bottom;

  const avatarUrl = (raw?: Record<string, unknown>): string | null => avatarUrlOf(avatarField, raw);

  const itemTip = (d: (typeof prepared.items)[number], frac: {x: number; y: number}): TooltipState => ({
    ...frac,
    title: d.label,
    img: avatarActive ? avatarUrl(d.raw) : null,
    rows: [{label: 'Valor', color: d.color ?? pickColor(config.colors, prepared.items.indexOf(d)), value: formatValue(d.value, numFmt)}],
  });

  if (horizontal) {
    const barH = Math.min(40, (plotH2 / n) * 0.7);
    const gap = (plotH2 - barH * n) / (n + 1);
    const tickValues = domain.ticks;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
          <defs>
            {config.barGradient && gradId && (
              <linearGradient id={gradId} {...gradProps}>
                <stop offset="0%" stopColor={config.barGradient.from} />
                <stop offset="100%" stopColor={config.barGradient.to} />
              </linearGradient>
            )}
            {frameFilter(shadowId, config.canvasShadow ?? false)}
          </defs>
          {frameRect(config, shadowId)}
          {config.showGrid !== false && tickValues.map((v, i) => {
            const x = marginAdj.left + ((v - domain.yMin) / yRange) * plotW2;
            return (
              <g key={i}>
                {i > 0 && <line x1={x} y1={marginAdj.top} x2={x} y2={marginAdj.top + plotH2} stroke={st.gridColor} strokeWidth={1} />}
                <text x={x} y={marginAdj.top + plotH2 + 14} textAnchor="middle" fill={st.textColor} fontSize={10}>
                  {formatValue(v, numFmt)}
                </text>
              </g>
            );
          })}
          {referenceLinesSvg(false, true, domain, yRange, marginAdj, plotW2, plotH2, config)}

          {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={st.axisColor} fontSize={11}>{config.xLabel}</text>}
          {config.yLabel && <text x={14} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 14, ${height / 2})`}>{config.yLabel}</text>}

          {prepared.items.map((d, i) => {
            const y = marginAdj.top + gap + i * (barH + gap);
            const barW = ((d.value - domain.yMin) / yRange) * plotW2;
            const bw = Math.max(barW, 0);
            const color = d.color ?? pickColor(config.colors, i);
            const img = avatarUrl(d.raw);
            const labelX = avatarActive && avatarPos === 'beside-label' && img
              ? marginAdj.left - 8 - avatarSize - 6
              : marginAdj.left - 8;
            const endX = marginAdj.left + bw;
            const barEndAvatar = avatarActive && avatarPos === 'bar-end' && !!img;
            const labelExtra = barEndAvatar ? avatarSize + 10 : 6;
            return (
              <g
                key={i}
                className={tooltipEnabled ? 'cursor-pointer' : undefined}
                onMouseMove={tooltipEnabled ? (e) => setTip(itemTip(d, hoverPos(e))) : undefined}
                onMouseLeave={tooltipEnabled ? () => setTip(null) : undefined}
              >
                <rect x={marginAdj.left} y={y} width={bw} height={barH} fill={barFill(color, config, gradId, d.value < 0)} rx={radius} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
                {config.showDataLabels !== false && dlPos === 'center' && (
                  <text x={marginAdj.left + bw / 2} y={y + barH / 2 + 3} textAnchor="middle" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {config.showDataLabels !== false && dlPos === 'inside' && (
                  <text x={marginAdj.left + 8} y={y + barH / 2 + 3} textAnchor="start" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {config.showDataLabels !== false && dlPos !== 'center' && dlPos !== 'inside' && (
                  <text x={endX + labelExtra} y={y + barH / 2 + 3} textAnchor="start" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                    {formatValue(d.value, numFmt)}
                  </text>
                )}
                {img && avatarPos === 'bar-end' && (
                  <Avatar href={img} cx={endX + labelExtra + avatarSize / 2} cy={y + barH / 2} clipId={`bh-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                )}
                {img && avatarPos === 'beside-label' && (
                  <Avatar href={img} cx={marginAdj.left - 8 - avatarSize / 2} cy={y + barH / 2} clipId={`bh-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                )}
                {img && avatarPos === 'replace-label' && (
                  <Avatar href={img} cx={marginAdj.left - 8 - avatarSize / 2} cy={y + barH / 2} clipId={`bh-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
                )}
                {!(avatarActive && avatarPos === 'replace-label' && img) && (
                  <text x={labelX} y={y + barH / 2 + 3} textAnchor="end" fill={st.textColor} fontSize={st.labelFontSize}>
                    {d.label.length > 16 ? d.label.slice(0, 16) + '…' : d.label}
                  </text>
                )}
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
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        <defs>
          {config.barGradient && gradId && (
            <linearGradient id={gradId} {...gradProps}>
              <stop offset="0%" stopColor={config.barGradient.from} />
              <stop offset="100%" stopColor={config.barGradient.to} />
            </linearGradient>
          )}
          {frameFilter(shadowId, config.canvasShadow ?? false)}
        </defs>
        {frameRect(config, shadowId)}
        {config.showGrid !== false && tickValues.map((v, i) => {
          const y = marginAdj.top + plotH2 - ((v - domain.yMin) / yRange) * plotH2;
          return (
            <g key={i}>
              {i > 0 && <line x1={marginAdj.left} y1={y} x2={width - marginAdj.right} y2={y} stroke={st.gridColor} strokeWidth={1} />}
              <text x={marginAdj.left - 8} y={y + 4} textAnchor="end" fill={st.textColor} fontSize={10}>
                {formatValue(v, numFmt)}
              </text>
            </g>
          );
        })}
        {referenceLinesSvg(false, false, domain, yRange, marginAdj, plotW2, plotH2, config)}

        {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={st.axisColor} fontSize={11}>{config.xLabel}</text>}
        {config.yLabel && <text x={16} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 16, ${height / 2})`}>{config.yLabel}</text>}

        {prepared.items.map((d, i) => {
          const x = marginAdj.left + gap + i * (barWidth + gap);
          const barH = ((d.value - domain.yMin) / yRange) * plotH2;
          const color = d.color ?? pickColor(config.colors, i);
          const img = avatarUrl(d.raw);
          const labelX = avatarActive && avatarPos === 'beside-label' && img
            ? x + barWidth / 2 + avatarSize + 6
            : x + barWidth / 2;
          const labelY = height - marginAdj.bottom + 14;
          const topY = marginAdj.top + plotH2 - barH;
          const barCenterY = topY + barH / 2;
          return (
            <g
              key={i}
              className={tooltipEnabled ? 'cursor-pointer' : undefined}
              onMouseMove={tooltipEnabled ? (e) => setTip(itemTip(d, hoverPos(e))) : undefined}
              onMouseLeave={tooltipEnabled ? () => setTip(null) : undefined}
            >
              <rect x={x} y={topY} width={barWidth} height={Math.max(barH, 0)} fill={barFill(color, config, gradId, d.value < 0)} rx={radius} stroke={borderW > 0 ? borderColor : 'none'} strokeWidth={borderW} opacity={st.globalOpacity} />
              {config.showDataLabels !== false && dlPos === 'center' && (
                <text x={x + barWidth / 2} y={barCenterY + 3} textAnchor="middle" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {config.showDataLabels !== false && dlPos === 'inside' && (
                <text x={x + barWidth / 2} y={topY + dlSize + 2} textAnchor="middle" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {config.showDataLabels !== false && dlPos !== 'center' && dlPos !== 'inside' && (
                <text x={x + barWidth / 2} y={topY - 6} textAnchor="middle" fill={dlColor} fontSize={dlSize} pointerEvents="none">
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {/* Avatar above the bar (stacked over the value label) */}
              {img && avatarPos === 'above' && (
                <Avatar href={img} cx={x + barWidth / 2} cy={topY - (config.showDataLabels !== false ? 6 + avatarSize / 2 : avatarSize / 2)} clipId={`bv-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
              )}
              {/* Avatar to the left of the category label */}
              {img && avatarPos === 'beside-label' && (
                <Avatar href={img} cx={x + barWidth / 2 - avatarSize / 2 - 6} cy={labelY} clipId={`bv-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
              )}
              {/* Avatar replacing the category label */}
              {img && avatarPos === 'replace-label' && (
                <Avatar href={img} cx={x + barWidth / 2} cy={labelY} clipId={`bv-av-${i}`} shape={avatarShape} size={avatarSize} radius={avatarRadius} />
              )}
              {!(avatarActive && avatarPos === 'replace-label' && img) && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill={st.textColor}
                  fontSize={st.labelFontSize}
                  transform={labelAngle !== 0 ? `rotate(${labelAngle}, ${labelX}, ${labelY})` : undefined}
                >
                  {d.label.length > 12 ? d.label.slice(0, 12) + '…' : d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tooltipEnabled && <HoverTooltip tip={tip} />}
    </div>
  );
}
