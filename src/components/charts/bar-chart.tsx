'use client';

import type {ChartConfig} from '@/lib/chart-config';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function BarChart({data, config}: Props) {
  const xField = config.xField ?? Object.keys(data[0] ?? {})[0] ?? '';
  const yField = config.yField ?? Object.keys(data[0] ?? {})[1] ?? '';

  const numericData = data
    .map((d) => ({label: String(d[xField] ?? ''), value: Number(d[yField] ?? 0)}))
    .filter((d) => !isNaN(d.value));

  if (numericData.length === 0) {
    return <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Sin datos numéricos</div>;
  }

  const maxVal = Math.max(...numericData.map((d) => d.value), 1);
  const width = 600;
  const height = 350;
  const margin = {top: 20, right: 20, bottom: 60, left: 60};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const barWidth = Math.min(60, (plotW / numericData.length) * 0.7);
  const gap = (plotW - barWidth * numericData.length) / (numericData.length + 1);

  const yTicks = 5;
  const tickValues = Array.from({length: yTicks + 1}, (_, i) => (maxVal / yTicks) * i);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid */}
      {config.showGrid !== false && tickValues.map((v, i) => {
        const y = margin.top + plotH - (v / maxVal) * plotH;
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#333" strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill="#888" fontSize={10}>
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {numericData.map((d, i) => {
        const x = margin.left + gap + i * (barWidth + gap);
        const barH = (d.value / maxVal) * plotH;
        const color = config.colors?.[i % (config.colors?.length ?? 12)] ?? '#6366f1';
        return (
          <g key={i}>
            <rect
              x={x}
              y={margin.top + plotH - barH}
              width={barWidth}
              height={barH}
              fill={color}
              rx={4}
              opacity={0.9}
            />
            {config.showLabels !== false && (
              <text
                x={x + barWidth / 2}
                y={margin.top + plotH - barH - 6}
                textAnchor="middle"
                fill="#ccc"
                fontSize={10}
              >
                {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : Math.round(d.value)}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={height - margin.bottom + 14}
              textAnchor="middle"
              fill="#888"
              fontSize={9}
              transform={numericData.length > 8 ? `rotate(-30, ${x + barWidth / 2}, ${height - margin.bottom + 14})` : undefined}
            >
              {d.label.length > 12 ? d.label.slice(0, 12) + '…' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
