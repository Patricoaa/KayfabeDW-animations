'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {formatValue, resolveChartStyle, resolveYDomain, resolveXDomain, colorFor} from '@/lib/chart-data';
import {SvgHeader, SvgLegend, headerHeight, legendReserve, frameRect, type LegendItem} from './chart-frame';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function ScatterChart({data, config}: Props) {
  const hidden = config.hiddenElements ?? [];
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
  const st = resolveChartStyle(config.style);

  // Per-category colors. Gather the distinct labels in first-appearance order
  // and map each to a palette color (with per-category overrides) when
  // colorField (or categoryField) is set.
  const cats: string[] = [];
  const catColors = new Map<string, string>();
  for (const p of points) {
    if (p.label && !catColors.has(p.label)) {
      cats.push(p.label);
      catColors.set(p.label, colorFor(config, p.label, cats.length - 1));
    }
  }
  const legendItems: LegendItem[] = cats.map((c) => ({label: c, color: catColors.get(c)!}));
  const headerH = headerHeight(config, st, config.width ?? 600);
  const legendR = legendReserve(config, legendItems);
  const margin = {top: 24 + headerH + legendR.top, right: 24 + legendR.right, bottom: 66 + legendR.bottom, left: 66};
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

  const showLegend = config.showLegend ?? true;
  const xAxisColor = config.xLabelFont?.color ?? st.axisColor;
  const yAxisColor = config.yLabelFont?.color ?? st.axisColor;
  const xAxisFamily = config.xLabelFont?.fontFamily;
  const yAxisFamily = config.yLabelFont?.fontFamily;
  const yTickFamily = config.yLabelFont?.fontFamily;
  const yTickSize = config.yLabelFont?.size ?? 10;
  const yTickColor = config.yLabelFont?.color ?? st.textColor;
  const yTickWeight = config.yLabelFont?.weight ?? 400;
  const xTickFamily = config.xLabelFont?.fontFamily;
  const xTickSize = config.xLabelFont?.size ?? 10;
  const xTickColor = config.xLabelFont?.color ?? st.textColor;
  const xTickWeight = config.xLabelFont?.weight ?? 400;
  const pointColor = (p: (typeof points)[number]) => (p.label && catColors.has(p.label) ? catColors.get(p.label)! : colorFor(config, p.label, 0));

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
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {frameRect(config)}
        {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
        {showLegend !== false && legendItems.length > 0 && <SvgLegend items={legendItems} position={config.legendPosition ?? 'bottom'} width={width} height={height} st={st} config={config} headerOffset={headerH} />}
      {config.showGrid !== false && yDom.ticks.map((v, i) => {
        const y = toY(v);
        return (
          <g key={`y-${i}`}>
            <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke={st.gridColor} strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill={yTickColor} fontSize={yTickSize} fontFamily={yTickFamily} fontWeight={yTickWeight}>{formatValue(v, numFmt)}</text>
          </g>
        );
      })}
      {config.showGrid !== false && xDom.ticks.map((v, i) => {
        const x = toX(v);
        return (
          <g key={`x-${i}`}>
            <line x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke={st.gridColor} strokeWidth={1} />
            <text x={x} y={margin.top + plotH + 14} textAnchor="middle" fill={xTickColor} fontSize={xTickSize} fontFamily={xTickFamily} fontWeight={xTickWeight}>{formatValue(v, numFmt)}</text>
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

      {!hidden.includes('xLabel') && <g data-editable="xLabel"><text x={width / 2} y={height - 8} textAnchor="middle" fill={xAxisColor} fontSize={11} fontFamily={xAxisFamily} fontWeight={config.xLabelFont?.weight ?? 400}>{xLabel}</text></g>}
      {!hidden.includes('yLabel') && <g data-editable="yLabel"><text x={14} y={height / 2} textAnchor="middle" fill={yAxisColor} fontSize={11} fontFamily={yAxisFamily} fontWeight={config.yLabelFont?.weight ?? 400} transform={`rotate(-90, 14, ${height / 2})`}>{yLabel}</text></g>}
    </svg>
    </div>
  );
}
