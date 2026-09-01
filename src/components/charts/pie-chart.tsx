'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {formatValue, resolveChartStyle, prepareSeries, colorFor} from '@/lib/chart-data';
import {SvgHeader, SvgLegend, headerHeight, legendReserve, frameRect, frameFilter, nextSvgId, type LegendItem} from './chart-frame';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

function arcPath(cx: number, cy: number, outerR: number, innerR: number, a0: number, a1: number) {
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  const sweep = 1;
  const x1o = cx + outerR * Math.cos(a0);
  const y1o = cy + outerR * Math.sin(a0);
  const x2o = cx + outerR * Math.cos(a1);
  const y2o = cy + outerR * Math.sin(a1);
  if (innerR <= 0) {
    return `M ${cx} ${cy} L ${x1o} ${y1o} A ${outerR} ${outerR} 0 ${largeArc} ${sweep} ${x2o} ${y2o} Z`;
  }
  const x2i = cx + innerR * Math.cos(a1);
  const y2i = cy + innerR * Math.sin(a1);
  const x1i = cx + innerR * Math.cos(a0);
  const y1i = cy + innerR * Math.sin(a0);
  return [
    `M ${x1o} ${y1o}`,
    `A ${outerR} ${outerR} 0 ${largeArc} ${sweep} ${x2o} ${y2o}`,
    `L ${x2i} ${y2i}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1i} ${y1i}`,
    'Z',
  ].join(' ');
}

export function PieChart({data, config}: Props) {
  const prepared = prepareSeries(data, config);
  const st = resolveChartStyle(config.style);
  const slices = prepared.items.filter((d) => d.value > 0);

  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        {data.length > 0 ? 'No hay valores positivos para el gráfico de pie' : 'Sin datos'}
      </div>
    );
  }

  const visible = config.sliceLimit && config.sliceLimit > 0 ? slices.slice(0, config.sliceLimit) : slices;
  const rest = config.sliceLimit && config.sliceLimit > 0 ? slices.slice(config.sliceLimit) : [];
  const shownTotal = visible.reduce((s, d) => s + d.value, 0);
  const restTotal = rest.reduce((s, d) => s + d.value, 0);
  const total = shownTotal + restTotal;
  const isDonut = (config.innerRadius ?? 0) > 0;
  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const labelMode = config.pieLabel ?? 'percent';

  // Canonical per-slice color (respects per-category overrides).
  const labelIndex = new Map<string, number>(prepared.items.map((p, i) => [p.label, i]));
  const colorAt = (label: string) => colorFor(config, label, labelIndex.get(label) ?? 0);

  // Header + legend reserves, then fit the pie in the remaining area.
  const legendItems: LegendItem[] = visible.map((s) => ({label: s.label, color: colorAt(s.label)}));
  const headerH = headerHeight(config, st);
  const legendR = legendReserve(config, legendItems);
  const showLegend = config.showLegend ?? true;
  const availW = width - 24 - legendR.right;
  const topInset = headerH + legendR.top + 24;
  const bottomInset = legendR.bottom + 24;
  const plotCX = availW / 2;
  const plotCY = topInset + (height - topInset - bottomInset) / 2;
  const outerR = Math.min((availW - 24) / 2, (height - topInset - bottomInset - 24) / 2, 190);
  const innerFrac = isDonut ? Math.max(0.15, Math.min((config.innerRadius ?? 50) / 100, 0.85)) : 0;
  const innerR = innerFrac * outerR;
  const shadowId = nextSvgId('f');

  let cumAngle = -Math.PI / 2;

  const renderLabel = (d: {value: number}, textX: number, textY: number) => {
    const parts: string[] = [];
    if (labelMode === 'value' || labelMode === 'both') parts.push(formatValue(d.value, config.numberFormat ?? 'short'));
    if (labelMode === 'percent' || labelMode === 'both') parts.push(`${Math.round((d.value / total) * 100)}%`);
    return (
      <text x={textX} y={textY} textAnchor="middle" fill={st.textColor} fontSize={st.labelFontSize} dominantBaseline="middle">
        {parts.join(' · ')}
      </text>
    );
  };

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        <defs>{frameFilter(shadowId, config.canvasShadow ?? false)}</defs>
        {frameRect(config, shadowId)}
        {headerH > 0 && <SvgHeader config={config} st={st} width={width} />}
        {showLegend && legendItems.length > 0 && <SvgLegend items={legendItems} position={config.legendPosition ?? 'bottom'} width={width} height={height} st={st} headerOffset={headerH} />}
        {visible.map((s) => {
          const angle = (s.value / total) * 2 * Math.PI;
          const startAngle = cumAngle;
          const midAngle = cumAngle + angle / 2;
          const endAngle = cumAngle + angle;
          const path = arcPath(plotCX, plotCY, outerR, innerR, startAngle, endAngle);
          const labelR = innerR > 0 ? (innerR + outerR) / 2 : outerR * 0.66;
          const lx = plotCX + labelR * Math.cos(midAngle);
          const ly = plotCY + labelR * Math.sin(midAngle);
          cumAngle = endAngle;
          return (
            <g key={`slice-${s.label}`}>
              <path d={path} fill={colorAt(s.label)} opacity={st.globalOpacity} />
              {labelMode !== 'none' && angle > 0.08 && renderLabel(s, lx, ly)}
            </g>
          );
        })}
        {restTotal > 0 && (
          <g>
            <circle cx={plotCX} cy={plotCY} r={outerR * 0.55} fill="none" stroke={st.axisColor} strokeWidth={outerR * 0.12} strokeDasharray="4 3" opacity={st.globalOpacity} />
            <text x={plotCX} y={plotCY + 4} textAnchor="middle" fill={st.textColor} fontSize={st.labelFontSize}>
              +{rest.length}
            </text>
          </g>
        )}
        {isDonut && (
          <text x={plotCX} y={plotCY - 4} textAnchor="middle" fill={st.textColor} fontSize={Math.max(12, st.labelFontSize + 3)} fontWeight={600}>
            {formatValue(shownTotal, config.numberFormat ?? 'short')}
          </text>
        )}
      </svg>
    </div>
  );
}