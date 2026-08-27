'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {prepareSeries, formatValue, pickColor} from '@/lib/chart-data';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function BarChart({data, config}: Props) {
  const xField = config.xField ?? '';
  const yField = config.yField ?? '';
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
  const barWidth = Math.min(60, (plotW / n) * 0.7);
  const gap = (plotW - barWidth * n) / (n + 1);

  const yTicks = 5;
  const tickValues = Array.from({length: yTicks + 1}, (_, i) => (maxVal / yTicks) * i);
  const numFmt = config.numberFormat ?? 'short';
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid + Y ticks */}
      {config.showGrid !== false && tickValues.map((v, i) => {
        const y = margin.top + plotH - (v / maxVal) * plotH;
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#333" strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill="#888" fontSize={10}>
              {formatValue(v, numFmt)}
            </text>
          </g>
        );
      })}

      {/* Axis labels */}
      {config.xLabel && (
        <text x={width / 2} y={height - 6} textAnchor="middle" fill="#aaa" fontSize={11}>
          {config.xLabel}
        </text>
      )}
      {config.yLabel && (
        <text x={16} y={height / 2} textAnchor="middle" fill="#aaa" fontSize={11} transform={`rotate(-90, 16, ${height / 2})`}>
          {config.yLabel}
        </text>
      )}

      {/* Bars */}
      {prepared.items.map((d, i) => {
        const x = margin.left + gap + i * (barWidth + gap);
        const barH = (d.value / maxVal) * plotH;
        const color = d.color ?? pickColor(config.colors, i);
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
            {config.showDataLabels !== false && (
              <text
                x={x + barWidth / 2}
                y={margin.top + plotH - barH - 6}
                textAnchor="middle"
                fill="#ccc"
                fontSize={10}
              >
                {formatValue(d.value, numFmt)}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={height - margin.bottom + 14}
              textAnchor="middle"
              fill="#888"
              fontSize={9}
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
