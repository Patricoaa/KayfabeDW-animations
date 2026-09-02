'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {prepareSeries, prepareMultiSeries, formatValue, resolveChartStyle, resolveYDomain, type PreparedMultiSeries} from '@/lib/chart-data';
import {SvgHeader, SvgLegend, headerHeight, legendReserve, frameRect, type LegendItem} from './chart-frame';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function LineChart({data, config}: Props) {
  if (config.seriesField) {
    const multi = prepareMultiSeries(data, config);
    if (multi.series.length === 0 || multi.categories.length === 0) {
      return <div className="flex items-center justify-center h-48 text-muted text-sm">Sin datos para este gráfico</div>;
    }
    return <MultiLine multi={multi} config={config} />;
  }
  return <SingleLine data={data} config={config} />;
}

function MultiLine({multi, config}: {multi: PreparedMultiSeries; config: ChartConfig}) {
  const st = resolveChartStyle(config.style);
  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const legendItems: LegendItem[] = multi.series.map((s) => ({label: s.name, color: s.color}));
  const headerH = headerHeight(config, st, config.width ?? 600);
  const legendR = legendReserve(config, legendItems);
  const margin = {top: 24 + headerH + legendR.top, right: 24 + legendR.right, bottom: 66 + legendR.bottom, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const n = multi.categories.length;
  const maxVal = multi.max || 1;
  const domain = resolveYDomain(0, maxVal, config);
  const yRange = Math.max(domain.yMax - domain.yMin, 0.001);
  const numFmt = config.numberFormat ?? 'short';
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);
  const showMarkers = config.showMarkers ?? true;
  const showLegend = config.showLegend ?? true;
  const legendPosition = config.legendPosition ?? 'bottom';
  const smooth = config.lineSmooth ?? false;
  const catColor = config.xLabelFont?.color ?? st.textColor;
  const catSize = config.xLabelFont?.size ?? st.labelFontSize;
  const catFamily = config.xLabelFont?.fontFamily ?? undefined;
  const catWeight = config.xLabelFont?.weight ?? 400;
  const xAxisColor = config.xLabelFont?.color ?? st.axisColor;
  const yAxisColor = config.yLabelFont?.color ?? st.axisColor;
  const xAxisFamily = config.xLabelFont?.fontFamily;
  const yAxisFamily = config.yLabelFont?.fontFamily;
  const yTickFamily = config.yLabelFont?.fontFamily;
  const yTickSize = config.yLabelFont?.size ?? 10;
  const yTickColor = config.yLabelFont?.color ?? st.textColor;
  const yTickWeight = config.yLabelFont?.weight ?? 400;

  const toX = (i: number) => margin.left + (i / Math.max(n - 1, 1)) * plotW;
  const toY = (v: number) => margin.top + plotH - ((v - domain.yMin) / yRange) * plotH;

  const tickValues = domain.ticks;
  const seriesPaths = multi.series.map((s) => {
    const pts = s.values.map((v, i) => ({x: toX(i), y: toY(v)}));
    return {
      ...s,
      points: pts,
      path: (smooth ? buildSmoothPath : buildLinearPath)(pts),
    };
  });

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {frameRect(config)}
        {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
        {showLegend && legendItems.length > 0 && <SvgLegend items={legendItems} position={legendPosition} width={width} height={height} st={st} config={config} headerOffset={headerH} />}
          {config.showGrid !== false && tickValues.map((v, i) => {
            const y = toY(v);
            return (
              <g key={i}>
                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke={st.gridColor} strokeWidth={1} />
                <text x={margin.left - 8} y={y + 4} textAnchor="end" fill={yTickColor} fontSize={yTickSize} fontFamily={yTickFamily} fontWeight={yTickWeight}>{formatValue(v, numFmt)}</text>
              </g>
            );
          })}
          {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={xAxisColor} fontSize={11} fontFamily={xAxisFamily}>{config.xLabel}</text>}
          {config.yLabel && <text x={16} y={height / 2} textAnchor="middle" fill={yAxisColor} fontSize={11} fontFamily={yAxisFamily} transform={`rotate(-90, 16, ${height / 2})`}>{config.yLabel}</text>}
          {seriesPaths.map((s) => (
            <path key={s.name} d={s.path} fill="none" stroke={s.color} strokeWidth={st.lineWidth} strokeLinejoin="round" strokeDasharray={config.lineDash ? '6 4' : undefined} />
          ))}
          {showMarkers &&
            seriesPaths.map((s) =>
              s.points.map((p, i) => (
                <circle key={`${s.name}-${i}`} cx={p.x} cy={p.y} r={st.pointSize} fill={s.color} stroke="#111" strokeWidth={1.5} opacity={st.pointOpacity} />
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
                fill={catColor}
                fontSize={catSize}
                fontFamily={catFamily}
                fontWeight={catWeight}
                transform={labelAngle !== 0 ? `rotate(${labelAngle}, ${cx}, ${height - margin.bottom + 14})` : undefined}
              >
                {cat.length > 10 ? cat.slice(0, 10) + '…' : cat}
              </text>
            );
          })}
        </svg>
    </div>
  );
}

function SingleLine({data, config}: Props) {
  const prepared = prepareSeries(data, config);
  const st = resolveChartStyle(config.style);
  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const margin = {top: 24 + headerHeight(config, st, config.width ?? 600), right: 24, bottom: 66, left: 66};
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const n = prepared.items.length;
  const maxVal = prepared.max || 1;
  const domain = resolveYDomain(0, maxVal, config);
  const yRange = Math.max(domain.yMax - domain.yMin, 0.001);
  const numFmt = config.numberFormat ?? 'short';
  const color = config.colors?.[0] ?? '#6366f1';
  const labelAngle = config.labelAngle ?? (n > 8 ? -30 : 0);
  const showMarkers = config.showMarkers ?? true;
  const smooth = config.lineSmooth ?? false;
  const catColor = config.xLabelFont?.color ?? st.textColor;
  const catSize = config.xLabelFont?.size ?? st.labelFontSize;
  const catFamily = config.xLabelFont?.fontFamily ?? undefined;
  const catWeight = config.xLabelFont?.weight ?? 400;
  const xAxisColor = config.xLabelFont?.color ?? st.axisColor;
  const yAxisColor = config.yLabelFont?.color ?? st.axisColor;
  const xAxisFamily = config.xLabelFont?.fontFamily;
  const yAxisFamily = config.yLabelFont?.fontFamily;
  const yTickFamily = config.yLabelFont?.fontFamily;
  const yTickSize = config.yLabelFont?.size ?? 10;
  const yTickColor = config.yLabelFont?.color ?? st.textColor;
  const yTickWeight = config.yLabelFont?.weight ?? 400;

  if (n === 0) {
    return <div className="flex items-center justify-center h-48 text-muted text-sm">Sin datos para este gráfico</div>;
  }

  const toX = (i: number) => margin.left + (i / Math.max(n - 1, 1)) * plotW;
  const toY = (v: number) => margin.top + plotH - ((v - domain.yMin) / yRange) * plotH;
  const tickValues = domain.ticks;
  const pts = prepared.items.map((p, i) => ({x: toX(i), y: toY(p.value)}));
  const path = (smooth ? buildSmoothPath : buildLinearPath)(pts);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {frameRect(config)}
        {headerHeight(config, st, config.width ?? 600) > 0 && <SvgHeader config={config} st={st} width={width} />}
      {config.showGrid !== false && tickValues.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke={st.gridColor} strokeWidth={1} />
            <text x={margin.left - 8} y={y + 4} textAnchor="end" fill={yTickColor} fontSize={yTickSize} fontFamily={yTickFamily} fontWeight={yTickWeight}>{formatValue(v, numFmt)}</text>
          </g>
        );
      })}
      {config.xLabel && <text x={width / 2} y={height - 6} textAnchor="middle" fill={xAxisColor} fontSize={11} fontFamily={xAxisFamily}>{config.xLabel}</text>}
      {config.yLabel && <text x={16} y={height / 2} textAnchor="middle" fill={yAxisColor} fontSize={11} fontFamily={yAxisFamily} transform={`rotate(-90, 16, ${height / 2})`}>{config.yLabel}</text>}
      <path d={path} fill="none" stroke={color} strokeWidth={st.lineWidth} strokeLinejoin="round" strokeDasharray={config.lineDash ? '6 4' : undefined} />
      {showMarkers &&
        pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={st.pointSize} fill={color} stroke="#111" strokeWidth={1.5} opacity={st.pointOpacity} />)}
      {n > 0 && prepared.items.map((p, i) => (
        <text
          key={i}
          x={toX(i)}
          y={height - margin.bottom + 14}
          textAnchor="middle"
          fill={catColor}
          fontSize={catSize}
          fontFamily={catFamily}
          fontWeight={catWeight}
          transform={labelAngle !== 0 ? `rotate(${labelAngle}, ${toX(i)}, ${height - margin.bottom + 14})` : undefined}
        >
          {p.label.length > 10 ? p.label.slice(0, 10) + '…' : p.label}
        </text>
      ))}
    </svg>
    </div>
  );
}

function buildLinearPath(pts: {x: number; y: number}[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function buildSmoothPath(pts: {x: number; y: number}[]): string {
  if (pts.length < 2) return buildLinearPath(pts);
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}
