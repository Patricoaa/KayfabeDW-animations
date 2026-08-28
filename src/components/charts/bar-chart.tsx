'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {prepareSeries, prepareMultiSeries, formatValue, pickColor, resolveChartStyle, type PreparedMultiSeries} from '@/lib/chart-data';
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

  const width = 600;
  const height = 380;
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const nCat = multi.categories.length;
  const nS = multi.series.length;
  const maxVal = multi.max || 1;
  const catBand = plotW / Math.max(nCat, 1);
  const innerGap = 2;
  const barW = stacked
    ? Math.max(catBand * 0.7 - innerGap * 2, 2)
    : Math.max(Math.min(catBand * 0.7 / nS - innerGap, 46), 2);

  const yTicks = 5;
  const tickValues = Array.from({length: yTicks + 1}, (_, i) => (maxVal / yTicks) * i);

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
            const y = margin.top + plotH - (v / maxVal) * plotH;
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
              const h = Math.max((Math.abs(val) / maxVal) * plotH, 0);
              let x: number;
              let y: number;
              if (stacked) {
                const base = stackBase![ci][si];
                const baseH = (base / maxVal) * plotH;
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
  const width = 600;
  const height = 380;
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxVal = prepared.max || 1;
  const n = prepared.items.length;

  if (horizontal) {
    const barH = Math.min(40, (plotH / n) * 0.7);
    const gap = (plotH - barH * n) / (n + 1);
    const xTicks = 5;
    const tickValues = Array.from({length: xTicks + 1}, (_, i) => (maxVal / xTicks) * i);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {config.showGrid !== false && tickValues.map((v, i) => {
          const x = margin.left + (v / maxVal) * plotW;
          return (
            <g key={i}>
              <line x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke={st.gridColor} strokeWidth={1} />
              <text x={x} y={margin.top + plotH + 14} textAnchor="middle" fill={st.textColor} fontSize={10}>
                {formatValue(v, numFmt)}
              </text>
            </g>
          );
        })}

        {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={st.axisColor} fontSize={11}>{config.xLabel}</text>}
        {config.yLabel && <text x={14} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 14, ${height / 2})`}>{config.yLabel}</text>}

        {prepared.items.map((d, i) => {
          const y = margin.top + gap + i * (barH + gap);
          const barW = (d.value / maxVal) * plotW;
          const color = d.color ?? pickColor(config.colors, i);
          return (
            <g key={i}>
              <rect x={margin.left} y={y} width={Math.max(barW, 0)} height={barH} fill={color} rx={4} opacity={st.globalOpacity} />
              {config.showDataLabels !== false && (
                <text x={margin.left + barW + 6} y={y + barH / 2 + 3} textAnchor="start" fill="#ccc" fontSize={10}>
                  {formatValue(d.value, numFmt)}
                </text>
              )}
              <text x={margin.left - 8} y={y + barH / 2 + 3} textAnchor="end" fill={st.textColor} fontSize={st.labelFontSize}>
                {d.label.length > 16 ? d.label.slice(0, 16) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const barWidth = Math.min(60, (plotW / n) * 0.7);
  const gap = (plotW - barWidth * n) / (n + 1);

  const yTicks = 5;
  const tickValues = Array.from({length: yTicks + 1}, (_, i) => (maxVal / yTicks) * i);
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
      {config.showGrid !== false && tickValues.map((v, i) => {
        const y = margin.top + plotH - (v / maxVal) * plotH;
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke={st.gridColor} strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill={st.textColor} fontSize={10}>
              {formatValue(v, numFmt)}
            </text>
          </g>
        );
      })}

      {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={st.axisColor} fontSize={11}>{config.xLabel}</text>}
      {config.yLabel && <text x={16} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 16, ${height / 2})`}>{config.yLabel}</text>}

      {prepared.items.map((d, i) => {
        const x = margin.left + gap + i * (barWidth + gap);
        const barH = (d.value / maxVal) * plotH;
        const color = d.color ?? pickColor(config.colors, i);
        return (
          <g key={i}>
            <rect x={x} y={margin.top + plotH - barH} width={barWidth} height={barH} fill={color} rx={4} opacity={st.globalOpacity} />
            {config.showDataLabels !== false && (
              <text x={x + barWidth / 2} y={margin.top + plotH - barH - 6} textAnchor="middle" fill="#ccc" fontSize={10}>
                {formatValue(d.value, numFmt)}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={height - margin.bottom + 14}
              textAnchor="middle"
              fill={st.textColor}
              fontSize={st.labelFontSize}
              transform={labelAngle !== 0 ? `rotate(${labelAngle}, ${x + barWidth / 2}, ${height - margin.bottom + 14})` : undefined}
            >
              {d.label.length > 12 ? d.label.slice(0, 12) + '…' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
