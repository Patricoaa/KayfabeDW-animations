'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {formatValue, resolveChartStyle, resolveYDomain, resolveXDomain, pickColor} from '@/lib/chart-data';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function ScatterChart({data, config}: Props) {
  const xField = config.xField ?? '';
  const yField = config.yField ?? '';
  const colorField = config.colorField ?? '';

  const points = data
    .map((d) => ({
      x: Number(d[xField] ?? 0),
      y: Number(d[yField] ?? 0),
      label: colorField ? String(d[colorField] ?? '') : String(d[config.categoryField ?? ''] ?? ''),
    }))
    .filter((d) => !isNaN(d.x) && !isNaN(d.y));

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        {data.length > 0 ? 'Selecciona dos campos numéricos para el dispersión' : 'Sin datos numéricos'}
      </div>
    );
  }

  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const margin = {top: 24, right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const dataMaxX = Math.max(...points.map((d) => d.x), 1);
  const dataMaxY = Math.max(...points.map((d) => d.y), 1);
  const xDom = resolveXDomain(0, dataMaxX, config);
  const yDom = resolveYDomain(0, dataMaxY, config);
  const xRange = Math.max(xDom.yMax - xDom.yMin, 0.001);
  const yRange = Math.max(yDom.yMax - yDom.yMin, 0.001);

  const toX = (v: number) => margin.left + ((v - xDom.yMin) / xRange) * plotW;
  const toY = (v: number) => margin.top + plotH - ((v - yDom.yMin) / yRange) * plotH;

  const numFmt = config.numberFormat ?? 'short';
  const xLabel = config.xLabel ?? xField;
  const yLabel = config.yLabel ?? yField;
  const st = resolveChartStyle(config.style);

  // Per-category colors. Gather the distinct labels in first-appearance order
  // and map each to a palette color when colorField (or categoryField) is set.
  const cats: string[] = [];
  const catColors = new Map<string, string>();
  for (const p of points) {
    if (p.label && !catColors.has(p.label)) {
      cats.push(p.label);
      catColors.set(p.label, pickColor(config.colors, cats.length - 1));
    }
  }
  const pointColor = (p: (typeof points)[number]) => (p.label && catColors.has(p.label) ? catColors.get(p.label)! : pickColor(config.colors, 0));

  // Optional linear trendline via least squares.
  let trendPath: string | undefined;
  if (config.trendline && points.length >= 2) {
    const n = points.length;
    const sx = points.reduce((s, p) => s + p.x, 0);
    const sy = points.reduce((s, p) => s + p.y, 0);
    const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
    const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sxx - sx * sx;
    if (denom !== 0) {
      const slope = (n * sxy - sx * sy) / denom;
      const intercept = (sy - slope * sx) / n;
      trendPath = `M ${toX(xDom.yMin)} ${toY(slope * xDom.yMin + intercept)} L ${toX(xDom.yMax)} ${toY(slope * xDom.yMax + intercept)}`;
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
      {config.showGrid !== false && yDom.ticks.map((v, i) => {
        const y = toY(v);
        return (
          <g key={`y-${i}`}>
            <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke={st.gridColor} strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill={st.textColor} fontSize={10}>{formatValue(v, numFmt)}</text>
          </g>
        );
      })}
      {config.showGrid !== false && xDom.ticks.map((v, i) => {
        const x = toX(v);
        return (
          <g key={`x-${i}`}>
            <line x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke={st.gridColor} strokeWidth={1} />
            <text x={x} y={margin.top + plotH + 14} textAnchor="middle" fill={st.textColor} fontSize={10}>{formatValue(v, numFmt)}</text>
          </g>
        );
      })}

      {trendPath && (
        <path d={trendPath} fill="none" stroke={st.axisColor} strokeWidth={1.5} strokeDasharray="5 4" opacity={st.pointOpacity} />
      )}

      {points.map((p, i) => (
        <circle
          key={i}
          cx={toX(p.x)}
          cy={toY(p.y)}
          r={st.pointSize}
          fill={pointColor(p)}
          opacity={st.pointOpacity * st.globalOpacity}
          stroke="#111"
          strokeWidth={1}
        />
      ))}

      <text x={width / 2} y={height - 8} textAnchor="middle" fill={st.axisColor} fontSize={11}>{xLabel}</text>
      <text x={14} y={height / 2} textAnchor="middle" fill={st.axisColor} fontSize={11} transform={`rotate(-90, 14, ${height / 2})`}>{yLabel}</text>
    </svg>
  );
}
