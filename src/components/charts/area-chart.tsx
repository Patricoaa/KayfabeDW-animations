'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {prepareSeries, prepareMultiSeries, formatValue, resolvedCategoryLabel, resolveChartStyle, resolveYDomain, type PreparedMultiSeries} from '@/lib/chart-data';
import {SvgHeader, SvgLegend, headerHeight, legendReserve, frameRect, type LegendItem} from './chart-frame';

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
  const st = resolveChartStyle(config.style);
  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const legendItems: LegendItem[] = multi.series.map((s) => ({label: s.name, color: s.color}));
  const headerH = headerHeight(config, st, config.width ?? 600);
  const legendR = legendReserve(config, legendItems);
  const sp = config.spacing ?? {};
  const margin = {top: (sp.plotMarginTop ?? 24) + headerH + legendR.top + (sp.headerPadding ?? 0) + (sp.legendSpacing ?? 0), right: (sp.plotMarginRight ?? 24) + legendR.right + (sp.legendSpacing ?? 0), bottom: (sp.plotMarginBottom ?? 66) + legendR.bottom + (sp.legendSpacing ?? 0), left: (sp.plotMarginLeft ?? 66)};
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
  const baseY = toY(domain.yMin);

  const tickValues = domain.ticks;
  const seriesPaths = multi.series.map((s) => {
    const pts = s.values.map((v, i) => ({x: toX(i), y: toY(v)}));
    const line = smooth ? buildSmoothPath(pts) : pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = n > 0 ? `${line} L ${toX(n - 1)} ${baseY} L ${toX(0)} ${baseY} Z` : line;
    return {name: s.name, color: s.color, points: pts, line, area};
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
          {seriesPaths.map((s) => <path key={s.name} d={s.area} fill={s.color} opacity={st.globalOpacity * 0.25} />)}
          {seriesPaths.map((s) => <path key={s.name} d={s.line} fill="none" stroke={s.color} strokeWidth={st.lineWidth} strokeLinejoin="round" strokeDasharray={config.lineDash ? '6 4' : undefined} />)}
          {showMarkers &&
            seriesPaths.map((s) =>
              s.points.map((p, i) => (
                <circle key={`${s.name}-${i}`} cx={p.x} cy={p.y} r={st.pointSize} fill={s.color} stroke="#111" strokeWidth={1.5} opacity={st.pointOpacity} />
              )),
            )}
          {n > 0 && multi.categories.map((cat, i) => {
            const cx = toX(i);
            const catText = resolvedCategoryLabel(config, cat);
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
                {catText.length > 10 ? catText.slice(0, 10) + '…' : catText}
              </text>
            );
          })}
        </svg>
    </div>
  );
}

function SingleArea({data, config}: Props) {
  const prepared = prepareSeries(data, config);
  const st = resolveChartStyle(config.style);
  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const sp = config.spacing ?? {};
  const margin = {top: (sp.plotMarginTop ?? 24) + headerHeight(config, st, config.width ?? 600) + (sp.headerPadding ?? 0), right: (sp.plotMarginRight ?? 24), bottom: (sp.plotMarginBottom ?? 66), left: (sp.plotMarginLeft ?? 66)};
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
  const baseY = toY(domain.yMin);
  const tickValues = domain.ticks;
  const pts = prepared.items.map((p, i) => ({x: toX(i), y: toY(p.value)}));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = n > 0 ? `${line} L ${toX(n - 1)} ${baseY} L ${toX(0)} ${baseY} Z` : line;

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
      <path d={area} fill={color} opacity={st.globalOpacity * 0.25} />
      <path d={line} fill="none" stroke={color} strokeWidth={st.lineWidth} strokeLinejoin="round" strokeDasharray={config.lineDash ? '6 4' : undefined} />
      {showMarkers && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={st.pointSize} fill={color} stroke="#111" strokeWidth={1.5} opacity={st.pointOpacity} />)}
      {n > 0 && prepared.items.map((p, i) => {
        const catText = resolvedCategoryLabel(config, p.label);
        return (
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
          {catText.length > 10 ? catText.slice(0, 10) + '…' : catText}
        </text>
      );
      })}
    </svg>
    </div>
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
