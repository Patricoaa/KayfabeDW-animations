'use client';

import type {ChartConfig} from '@/lib/chart-config';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function AreaChart({data, config}: Props) {
  const xField = config.xField ?? Object.keys(data[0] ?? {})[0] ?? '';
  const yField = config.yField ?? Object.keys(data[0] ?? {})[1] ?? '';

  const points = data
    .map((d, i) => ({x: i, label: String(d[xField] ?? ''), value: Number(d[yField] ?? 0)}))
    .filter((d) => !isNaN(d.value));

  if (points.length === 0) {
    return <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Sin datos numéricos</div>;
  }

  const maxVal = Math.max(...points.map((d) => d.value), 1);
  const width = 600;
  const height = 350;
  const margin = {top: 20, right: 20, bottom: 60, left: 60};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const toX = (i: number) => margin.left + (i / Math.max(points.length - 1, 1)) * plotW;
  const toY = (v: number) => margin.top + plotH - (v / maxVal) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.value)}`).join(' ');
  const areaPath = `${linePath} L ${toX(points.length - 1)} ${margin.top + plotH} L ${toX(0)} ${margin.top + plotH} Z`;

  const yTicks = 5;
  const tickValues = Array.from({length: yTicks + 1}, (_, i) => (maxVal / yTicks) * i);
  const color = config.colors?.[0] ?? '#6366f1';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {config.showGrid !== false && tickValues.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#333" strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill="#888" fontSize={10}>
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill={color} opacity={0.25} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />

      {points.map((p, i) => (
        <text
          key={i}
          x={toX(i)}
          y={height - margin.bottom + 14}
          textAnchor="middle"
          fill="#888"
          fontSize={9}
          transform={points.length > 8 ? `rotate(-30, ${toX(i)}, ${height - margin.bottom + 14})` : undefined}
        >
          {p.label.length > 10 ? p.label.slice(0, 10) + '…' : p.label}
        </text>
      ))}
    </svg>
  );
}
