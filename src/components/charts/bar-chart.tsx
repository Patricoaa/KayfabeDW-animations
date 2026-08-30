'use client';

import type {ChartConfig} from '@/lib/chart-config';
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

function MultiBar({multi, config}: {multi: PreparedMultiSeries; config: ChartConfig}) {
  const st = resolveChartStyle(config.style);
  const numFmt = config.numberFormat ?? 'short';
  const stacked = (config.groupMode ?? 'grouped') === 'stacked' || !!config.stacked;
  const showLegend = config.showLegend ?? true;
  const legendPosition = config.legendPosition ?? 'bottom';
  const labelAngle = config.labelAngle ?? (multi.categories.length > 8 ? -30 : 0);

  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const nCat = multi.categories.length;
  const nS = multi.series.length;
  const maxVal = Math.max(multi.max, 0) || 1;
  const domain = resolveYDomain(0, maxVal, config);
  const yRange = Math.max(domain.yMax - domain.yMin, 0.001);
  const catBand = plotW / Math.max(nCat, 1);
  const innerGap = 2;
  const barW = stacked
    ? Math.max(catBand * 0.7 - innerGap * 2, 2)
    : Math.max(Math.min(catBand * 0.7 / nS - innerGap, 46), 2);

  const tickValues = domain.ticks;

  const stackBase = stacked
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
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
          {config.showGrid !== false && tickValues.map((v, i) => {
            const y = margin.top + plotH - ((v - domain.yMin) / yRange) * plotH;
            return (
              <g key={i}>
                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke={st.gridColor} strokeWidth={1} />
                <text x={margin.left - 8} y={y + 4} textAnchor="end" fill={st.textColor} fontSize={10}>
                  {formatValue(v, numFmt)}
                </text>
              </g>
            );
          })}

          {config.xLabel && (
            <text x={width / 2} y={height - 6} textAnchor="middle" fill={st.axisColor} fontSize={11}>{config.xLabel}</text>
          )}
          {config.yLabel && (
            <text x={16} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 16, ${height / 2})`}>
              {config.yLabel}
            </text>
          )}

          {multi.categories.map((cat, ci) => {
            const bandX = margin.left + ci * catBand;
            return multi.series.map((s, si) => {
              const val = s.values[ci] ?? 0;
              const h = Math.max((Math.abs(val) / yRange) * plotH, 0);
              let x: number;
              let y: number;
              if (stacked) {
                const base = stackBase![ci][si];
                const baseH = (base / yRange) * plotH;
                x = bandX + catBand * 0.15;
                y = margin.top + plotH - baseH - h;
              } else {
                const offset = (catBand - barW * nS) / 2;
                x = bandX + offset + si * (barW + innerGap);
                y = margin.top + plotH - h;
              }
              return (
                <rect
                  key={`${ci}-${si}`}
                  x={x}
                  y={y}
                  width={stacked ? catBand * 0.7 : barW}
                  height={h}
                  fill={s.color}
                  rx={2}
                  opacity={st.globalOpacity}
                />
              );
            });
          })}

          {multi.categories.map((cat, ci) => {
            const bandX = margin.left + ci * catBand;
            const cx = bandX + catBand / 2;
            return (
              <text
                key={ci}
                x={cx}
                y={height - margin.bottom + 14}
                textAnchor="middle"
                fill={st.textColor}
                fontSize={st.labelFontSize}
                transform={labelAngle !== 0 ? `rotate(${labelAngle}, ${cx}, ${height - margin.bottom + 14})` : undefined}
              >
                {cat.length > 12 ? cat.slice(0, 12) + '…' : cat}
              </text>
            );
          })}
        </svg>
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

  const marginAdj = {...margin};
  if (avatarActive) {
    if (!horizontal && avatarPos === 'above') marginAdj.top += avatarSize + 10;
    if (horizontal && avatarPos === 'bar-end') marginAdj.right += avatarSize + 14;
  }
  const plotW2 = width - marginAdj.left - marginAdj.right;
  const plotH2 = height - marginAdj.top - marginAdj.bottom;

  // Returns a valid image URL from the row, or null when missing/invalid.
  const avatarUrl = (raw?: Record<string, unknown>): string | null => {
    if (!avatarField) return null;
    const v = raw?.[avatarField];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (t === '') return null;
    if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:image/') || t.startsWith('/')) return t;
    return null;
  };

  const Avatar = ({href, cx, cy, clipId}: {href: string; cx: number; cy: number; clipId: string}) => {
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            {avatarShape === 'circle' ? (
              <circle cx={cx} cy={cy} r={avatarSize / 2} />
            ) : (
              <rect x={cx - avatarSize / 2} y={cy - avatarSize / 2} width={avatarSize} height={avatarSize} rx={avatarRadius} />
            )}
          </clipPath>
        </defs>
        <image
          href={href}
          x={cx - avatarSize / 2}
          y={cy - avatarSize / 2}
          width={avatarSize}
          height={avatarSize}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      </g>
    );
  };

  if (horizontal) {
    const barH = Math.min(40, (plotH2 / n) * 0.7);
    const gap = (plotH2 - barH * n) / (n + 1);
    const tickValues = domain.ticks;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {config.showGrid !== false && tickValues.map((v, i) => {
          const x = marginAdj.left + ((v - domain.yMin) / yRange) * plotW2;
          return (
            <g key={i}>
              <line x1={x} y1={marginAdj.top} x2={x} y2={marginAdj.top + plotH2} stroke={st.gridColor} strokeWidth={1} />
              <text x={x} y={marginAdj.top + plotH2 + 14} textAnchor="middle" fill={st.textColor} fontSize={10}>
                {formatValue(v, numFmt)}
              </text>
            </g>
          );
        })}

        {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={st.axisColor} fontSize={11}>{config.xLabel}</text>}
        {config.yLabel && <text x={14} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 14, ${height / 2})`}>{config.yLabel}</text>}

        {prepared.items.map((d, i) => {
          const y = marginAdj.top + gap + i * (barH + gap);
          const barW = ((d.value - domain.yMin) / yRange) * plotW2;
          const color = d.color ?? pickColor(config.colors, i);
          const img = avatarUrl(d.raw);
          const labelX = avatarActive && avatarPos === 'beside-label' && img
            ? marginAdj.left - 8 - avatarSize - 6
            : marginAdj.left - 8;
          return (
            <g key={i}>
              <rect x={marginAdj.left} y={y} width={Math.max(barW, 0)} height={barH} fill={color} rx={4} opacity={st.globalOpacity} />
              {config.showDataLabels !== false && (
                <text x={marginAdj.left + barW + 6} y={y + barH / 2 + 3} textAnchor="start" fill="#ccc" fontSize={10}>
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              {img && avatarPos === 'bar-end' && (
                <Avatar href={img} cx={marginAdj.left + Math.max(barW, 0) + (config.showDataLabels !== false ? 52 : 10) + avatarSize / 2} cy={y + barH / 2} clipId={`bh-av-${i}`} />
              )}
              {img && avatarPos === 'beside-label' && (
                <Avatar href={img} cx={marginAdj.left - 8 - avatarSize / 2} cy={y + barH / 2} clipId={`bh-av-${i}`} />
              )}
              {img && avatarPos === 'replace-label' && (
                <Avatar href={img} cx={marginAdj.left - 8 - avatarSize / 2} cy={y + barH / 2} clipId={`bh-av-${i}`} />
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
    );
  }

  const barWidth = Math.min(60, (plotW2 / n) * 0.7);
  const gap = (plotW2 - barWidth * n) / (n + 1);

  const tickValues = domain.ticks;
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
      {config.showGrid !== false && tickValues.map((v, i) => {
        const y = marginAdj.top + plotH2 - ((v - domain.yMin) / yRange) * plotH2;
        return (
          <g key={i}>
            <line x1={marginAdj.left} y1={y} x2={width - marginAdj.right} y2={y} stroke={st.gridColor} strokeWidth={1} />
            <text x={marginAdj.left - 8} y={y + 4} textAnchor="end" fill={st.textColor} fontSize={10}>
              {formatValue(v, numFmt)}
            </text>
          </g>
        );
      })}

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
        return (
          <g key={i}>
            <rect x={x} y={topY} width={barWidth} height={barH} fill={color} rx={4} opacity={st.globalOpacity} />
            {config.showDataLabels !== false && (
              <text x={x + barWidth / 2} y={topY - 6} textAnchor="middle" fill="#ccc" fontSize={10}>
                {formatValue(d.value, numFmt)}
              </text>
            )}
            {/* Avatar above the bar (stacked over the value label) */}
            {img && avatarPos === 'above' && (
              <Avatar href={img} cx={x + barWidth / 2} cy={topY - (config.showDataLabels !== false ? 6 + avatarSize / 2 : avatarSize / 2)} clipId={`bv-av-${i}`} />
            )}
            {/* Avatar to the left of the category label */}
            {img && avatarPos === 'beside-label' && (
              <Avatar href={img} cx={x + barWidth / 2 - avatarSize / 2 - 6} cy={labelY} clipId={`bv-av-${i}`} />
            )}
            {/* Avatar replacing the category label */}
            {img && avatarPos === 'replace-label' && (
              <Avatar href={img} cx={x + barWidth / 2} cy={labelY} clipId={`bv-av-${i}`} />
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
  );
}
