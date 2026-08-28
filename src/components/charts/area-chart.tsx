'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {prepareSeries, prepareMultiSeries, formatValue, type PreparedMultiSeries} from '@/lib/chart-data';
import {Legend} from './legend';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function AreaChart({data, config}: Props) {
  if (config.seriesField) {
    const multi = prepareMultiSeries(data, config);
    if (multi.series.length === 0 || multi.categories.length === 0) {
      return <div className="flex items-center justify-center h-48 text-muted text-sm">Sin datos para este gráfico</div>;
    }
    return <MultiArea multi={multi} config={config} />;
  }
  return <SingleArea data={data} config={config} />;
}

function MultiArea({multi, config}: {multi: PreparedMultiSeries; config: ChartConfig}) {
  const width = 600;
  const height = 380;
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const n = multi.categories.length;
  const maxVal = multi.max || 1;
  const numFmt = config.numberFormat ?? 'short';
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);
  const showMarkers = config.showMarkers ?? true;
  const showLegend = config.showLegend ?? true;
  const legendPosition = config.legendPosition ?? 'bottom';
  const smooth = config.lineSmooth ?? false;

  const toX = (i: number) => margin.left + (i / Math.max(n - 1, 1)) * plotW;
  const toY = (v: number) => margin.top + plotH - (v / maxVal) * plotH;
  const baseY = margin.top + plotH;

  const yTicks = 5;
  const tickValues = Array.from({length: yTicks + 1}, (_, i) => (maxVal / yTicks) * i);
  const seriesPaths = multi.series.map((s) => {
    const pts = s.values.map((v, i) => ({x: toX(i), y: toY(v)}));
    const line = smooth ? buildSmoothPath(pts) : pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = n > 0 ? `${line} L ${toX(n - 1)} ${baseY} L ${toX(0)} ${baseY} Z` : line;
    return {name: s.name, color: s.color, points: pts, line, area};
  });

  return (
    <div className="flex flex-col gap-2">
      {showLegend && legendPosition === 'top' && <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="top" />}
      <div className="flex gap-2">
        {showLegend && legendPosition === 'right' && <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="right" />}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {config.showGrid !== false && tickValues.map((v, i) => {
            const y = toY(v);
            return (
              <g key={i}>
                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#333" strokeWidth={1} />
                <text x={margin.left - 8} y={y + 4} textAnchor="end" fill="#888" fontSize={10}>{formatValue(v, numFmt)}</text>
              </g>
            );
          })}
          {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill="#aaa" fontSize={11}>{config.xLabel}</text>}
          {config.yLabel && <text x={16} y={height / 2} textAnchor="middle" fill="#aaa" fontSize={11} transform={`rotate(-90, 16, ${height / 2})`}>{config.yLabel}</text>}
          {seriesPaths.map((s) => <path key={s.name} d={s.area} fill={s.color} opacity={0.25} />)}
          {seriesPaths.map((s) => <path key={s.name} d={s.line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />)}
          {showMarkers &&
            seriesPaths.map((s) =>
              s.points.map((p, i) => (
                <circle key={`${s.name}-${i}`} cx={p.x} cy={p.y} r={4} fill={s.color} stroke="#111" strokeWidth={1.5} />
              )),
            )}
          {n > 0 && multi.categories.map((cat, i) => {
            const cx = toX(i);
            return (
              <text
                key={i}
                x={cx}
                y={height - margin.bottom + 14}
                textAnchor="middle"
                fill="#888"
                fontSize={9}
                transform={labelAngle !== 0 ? `rotate(${labelAngle}, ${cx}, ${height - margin.bottom + 14})` : undefined}
              >
                {cat.length > 10 ? cat.slice(0, 10) + '…' : cat}
              </text>
            );
          })}
        </svg>
      </div>
      {showLegend && legendPosition === 'bottom' && <Legend items={multi.series.map((s) => ({label: s.name, color: s.color}))} position="bottom" />}
    </div>
  );
}

function SingleArea({data, config}: Props) {
  const prepared = prepareSeries(data, config);
  const width = 600;
  const height = 380;
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const n = prepared.items.length;
  const maxVal = prepared.max || 1;
  const numFmt = config.numberFormat ?? 'short';
  const color = config.colors?.[0] ?? '#6366f1';
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);
  const showMarkers = config.showMarkers ?? true;

  if (n === 0) {
    return <div className="flex items-center justify-center h-48 text-muted text-sm">Sin datos para este gráfico</div>;
  }

  const toX = (i: number) => margin.left + (i / Math.max(n - 1, 1)) * plotW;
  const toY = (v: number) => margin.top + plotH - (v / maxVal) * plotH;
  const baseY = margin.top + plotH;
  const yTicks = 5;
  const tickValues = Array.from({length: yTicks + 1}, (_, i) => (maxVal / yTicks) * i);
  const pts = prepared.items.map((p, i) => ({x: toX(i), y: toY(p.value)}));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = n > 0 ? `${line} L ${toX(n - 1)} ${baseY} L ${toX(0)} ${baseY} Z` : line;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {config.showGrid !== false && tickValues.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#333" strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill="#888" fontSize={10}>{formatValue(v, numFmt)}</text>
          </g>
        );
      })}
      {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill="#aaa" fontSize={11}>{config.xLabel}</text>}
      {config.yLabel && <text x={16} y={height / 2} textAnchor="middle" fill="#aaa" fontSize={11} transform={`rotate(-90, 16, ${height / 2})`}>{config.yLabel}</text>}
      <path d={area} fill={color} opacity={0.25} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {showMarkers && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="#111" strokeWidth={1.5} />)}
      {n > 0 && prepared.items.map((p, i) => (
        <text
          key={i}
          x={toX(i)}
          y={height - margin.bottom + 14}
          textAnchor="middle"
          fill="#888"
          fontSize={9}
          transform={labelAngle !== 0 ? `rotate(${labelAngle}, ${toX(i)}, ${height - margin.bottom + 14})` : undefined}
        >
          {p.label.length > 10 ? p.label.slice(0, 10) + '…' : p.label}
        </text>
      ))}
    </svg>
  );
}

function buildSmoothPath(pts: {x: number; y: number}[]): string {
  if (pts.length < 2) return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}
