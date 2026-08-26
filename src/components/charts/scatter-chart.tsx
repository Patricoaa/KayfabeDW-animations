'use client';

import type {ChartConfig} from '@/lib/chart-config';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function ScatterChart({data, config}: Props) {
  const xField = config.xField ?? Object.keys(data[0] ?? {})[0] ?? '';
  const yField = config.yField ?? Object.keys(data[0] ?? {})[1] ?? '';

  const points = data
    .map((d) => ({
      x: Number(d[xField] ?? 0),
      y: Number(d[yField] ?? 0),
      label: String(d[config.categoryField ?? ''] ?? ''),
    }))
    .filter((d) => !isNaN(d.x) && !isNaN(d.y));

  if (points.length === 0) {
    return <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Sin datos numéricos</div>;
  }

  const maxX = Math.max(...points.map((d) => d.x), 1);
  const maxY = Math.max(...points.map((d) => d.y), 1);
  const width = 600;
  const height = 350;
  const margin = {top: 20, right: 20, bottom: 60, left: 60};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const toX = (v: number) => margin.left + (v / maxX) * plotW;
  const toY = (v: number) => margin.top + plotH - (v / maxY) * plotH;

  const color = config.colors?.[0] ?? '#6366f1';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {config.showGrid !== false && [0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
        <g key={i}>
          <line x1={toX(frac * maxX)} y1={margin.top} x2={toX(frac * maxX)} y2={margin.top + plotH} stroke="#333" strokeWidth={1} />
          <line x1={margin.left} y1={toY(frac * maxY)} x2={margin.left + plotW} y2={toY(frac * maxY)} stroke="#333" strokeWidth={1} />
        </g>
      ))}

      {points.map((p, i) => (
        <circle
          key={i}
          cx={toX(p.x)}
          cy={toY(p.y)}
          r={6}
          fill={color}
          opacity={0.7}
          stroke="#111"
          strokeWidth={1}
        />
      ))}

      <text x={width / 2} y={height - 8} textAnchor="middle" fill="#888" fontSize={11}>{xField}</text>
      <text x={14} y={height / 2} textAnchor="middle" fill="#888" fontSize={11} transform={`rotate(-90, 14, ${height / 2})`}>{yField}</text>
    </svg>
  );
}
