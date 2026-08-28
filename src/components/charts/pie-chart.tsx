'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {formatValue, resolveChartStyle, prepareSeries, pickColor} from '@/lib/chart-data';

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
  const innerR = isDonut ? Math.max(10, Math.min(config.innerRadius ?? 50, 90)) : 0;
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = Math.min(110, innerR > 0 ? innerR + 95 : 110);
  const labelMode = config.pieLabel ?? 'percent';

  // Canonical color per slice.
  const colorAt = (i: number) => prepared.items[i]?.color ?? pickColor(config.colors, i);

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
    <div className="flex items-center gap-4" style={{fontFamily: st.fontFamily}}>
      <div className="relative flex-shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48">
          {visible.map((s, i) => {
            const angle = (s.value / total) * 2 * Math.PI;
            const startAngle = cumAngle;
            const midAngle = cumAngle + angle / 2;
            const endAngle = cumAngle + angle;
            const path = arcPath(cx, cy, outerR, innerR, startAngle, endAngle);
            const labelR = innerR > 0 ? (innerR + outerR) / 2 : outerR * 0.66;
            const lx = cx + labelR * Math.cos(midAngle);
            const ly = cy + labelR * Math.sin(midAngle);
            cumAngle = endAngle;
            return (
              <g key={`slice-${i}`}>
                <path d={path} fill={colorAt(i)} opacity={st.globalOpacity} />
                {labelMode !== 'none' && angle > 0.08 && renderLabel(s, lx, ly)}
              </g>
            );
          })}
          {restTotal > 0 && (
            <g>
              <circle cx={cx} cy={cy} r={outerR * 0.55} fill="none" stroke={st.axisColor} strokeWidth={outerR * 0.12} strokeDasharray="4 3" opacity={st.globalOpacity} />
              <text x={cx} y={cy + 4} textAnchor="middle" fill={st.textColor} fontSize={st.labelFontSize}>
                +{rest.length}
              </text>
            </g>
          )}
          {isDonut && (
            <text x={cx} y={cy - 4} textAnchor="middle" fill={st.textColor} fontSize={Math.max(12, st.labelFontSize + 3)} fontWeight={600}>
              {formatValue(shownTotal, config.numberFormat ?? 'short')}
            </text>
          )}
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        {visible.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{backgroundColor: colorAt(i)}} />
            <span className="text-secondary truncate max-w-[120px]">{s.label}</span>
            <span className="text-primary">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
        {restTotal > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <div className="w-3 h-3 rounded-sm flex-shrink-0 border border-dashed border-current" />
            <span className="truncate max-w-[120px]">Otros ({rest.length})</span>
            <span>{Math.round((restTotal / total) * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
