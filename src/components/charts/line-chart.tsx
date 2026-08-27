'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {prepareSeries, formatValue} from '@/lib/chart-data';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function LineChart({data, config}: Props) {
  const prepared = prepareSeries(data, config);

  if (prepared.items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        {data.length > 0 ? 'No se encontraron valores numéricos para este gráfico' : 'Sin datos numéricos'}
      </div>
    );
  }

  const maxVal = prepared.max || 1;
  const width = 600;
  const height = 380;
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const n = prepared.items.length;

  const toX = (i: number) => margin.left + (i / Math.max(n - 1, 1)) * plotW;
  const toY = (v: number) => margin.top + plotH - (v / maxVal) * plotH;

  const smooth = config.lineSmooth ?? false;
  const linePath = smooth
    ? buildSmoothPath(prepared.items.map((p, i) => ({x: toX(i), y: toY(p.value)})))
    : prepared.items.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.value)}`).join(' ');
  const areaPath = `${linePath} L ${toX(n - 1)} ${margin.top + plotH} L ${toX(0)} ${margin.top + plotH} Z`;

  const yTicks = 5;
  const tickValues = Array.from({length: yTicks + 1}, (_, i) => (maxVal / yTicks) * i);
  const color = config.colors?.[0] ?? '#6366f1';
  const numFmt = config.numberFormat ?? 'short';
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {config.showGrid !== false && tickValues.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#333" strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill="#888" fontSize={10}>
              {formatValue(v, numFmt)}
            </text>
          </g>
        );
      })}

      {config.xLabel && (
        <text x={width / 2} y={height - 6} textAnchor="middle" fill="#aaa" fontSize={11}>{config.xLabel}</text>
      )}
      {config.yLabel && (
        <text x={16} y={height / 2} textAnchor="middle" fill="#aaa" fontSize={11} transform={`rotate(-90, 16, ${height / 2})`}>
          {config.yLabel}
        </text>
      )}

      <path d={areaPath} fill={color} opacity={0.1} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />

      {prepared.items.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.value)} r={4} fill={color} stroke="#111" strokeWidth={1.5} />
      ))}

      {prepared.items.map((p, i) => (
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
