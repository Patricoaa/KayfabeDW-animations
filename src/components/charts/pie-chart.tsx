'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {preparePie, resolveChartStyle, formatValue, type PieSlice} from '@/lib/chart-data';
import {
  Zone,
  SvgHeader,
  SvgLegend,
  ChartOverlays,
  frameRect,
  headerHeight,
  legendReserve,
  legendItemsFrom,
  type LegendItem,
} from './chart-frame';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

// Coordenadas polares (SVG: y hacia abajo, así ángulos crecientes giran en
// sentido horario en pantalla).
function polar(cx: number, cy: number, r: number, a: number): {x: number; y: number} {
  return {x: cx + r * Math.cos(a), y: cy + r * Math.sin(a)};
}

// Camino cerrado de un segmento de torta/donut. Sin agujero interior genera un
// arco simple; con innerRadius>0 dibuja el anillo entre el radio exterior e
// interior (donut). Un slice único (2π) produce el círculo completo.
function slicePath(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, rOut, a0);
  const p1 = polar(cx, cy, rOut, a1);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  if (rIn <= 0) {
    return `M ${p0.x} ${p0.y} A ${rOut} ${rOut} 0 ${largeArc} 1 ${p1.x} ${p1.y} L ${cx} ${cy} Z`;
  }
  const p2 = polar(cx, cy, rIn, a1);
  const p3 = polar(cx, cy, rIn, a0);
  return `M ${p0.x} ${p0.y} A ${rOut} ${rOut} 0 ${largeArc} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rIn} ${rIn} 0 ${largeArc} 0 ${p3.x} ${p3.y} Z`;
}

export function PieChart({data, config}: Props) {
  const slices = preparePie(data, config);
  const st = resolveChartStyle(config.style);
  const width = config.width ?? 600;
  const height = config.height ?? 380;
  const legendItems: LegendItem[] = legendItemsFrom(slices, config, (s) => s.label, (s) => s.color);
  const headerH = headerHeight(config, st, width);
  const legendR = legendReserve(config, legendItems, width);
  const sp = config.spacing ?? {};
  const margin = {
    top: (sp.plotMarginTop ?? 24) + headerH + legendR.top + (sp.headerPadding ?? 0) + (sp.legendSpacing ?? 0),
    right: (sp.plotMarginRight ?? 40) + legendR.right + (sp.legendSpacing ?? 0),
    bottom: (sp.plotMarginBottom ?? 66) + legendR.bottom + (sp.legendSpacing ?? 0),
    left: (sp.plotMarginLeft ?? 66),
  };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const cx = margin.left + plotW / 2;
  const cy = margin.top + plotH / 2;
  const rOut = Math.max(20, Math.min(plotW, plotH) / 2 - 6);
  const innerFrac = Math.max(0, Math.min(0.9, config.innerRadius ?? 0));
  const rIn = rOut * innerFrac;

  const showLegend = config.showLegend ?? true;
  const numFmt = config.numberFormat ?? 'short';
  const labelMode = config.pieLabel ?? 'percent';
  const labelsOn = (config.showDataLabels ?? true) && labelMode !== 'none';
  const dlSize = config.dataLabelFont?.size ?? config.dataLabelFontSize ?? 10;
  const dlColor = config.dataLabelFont?.color ?? config.dataLabelColor ?? st.textColor;
  const dlFamily = config.dataLabelFont?.fontFamily ?? undefined;
  const dlWeight = config.dataLabelFont?.weight ?? 400;
  const sliceBorderW = config.barBorderWidth ?? 0;
  const sliceBorderColor = config.barBorderColor ?? '#ffffff';

  if (slices.length === 0) {
    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
          {frameRect(config)}
        </svg>
      </div>
    );
  }

  const sliceLabel = (s: PieSlice): string => {
    const value = formatValue(s.value, numFmt);
    if (labelMode === 'value') return value;
    if (labelMode === 'both') return `${value} · ${s.percentLabel}`;
    return s.percentLabel;
  };

  const labelRadius = rIn + (rOut - rIn) * 0.62;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{fontFamily: st.fontFamily}}>
        {frameRect(config)}
        <ChartOverlays config={config} st={st} width={width} zIndexFilter="back" />
        <Zone id="header">
          {(config.title || config.subtitle) && <SvgHeader config={config} st={st} width={width} />}
          {showLegend && legendItems.length > 0 && <SvgLegend items={legendItems} position="bottom" width={width} height={height} st={st} config={config} headerOffset={headerH} />}
        </Zone>
        <Zone id="plot">
          {slices.map((s, i) => {
            const mid = (s.startAngle + s.endAngle) / 2;
            const lp = polar(cx, cy, labelRadius, mid);
            return (
              <g key={i} opacity={st.globalOpacity}>
                <path
                  d={slicePath(cx, cy, rOut, rIn, s.startAngle, s.endAngle)}
                  fill={s.color}
                  stroke={sliceBorderW > 0 ? sliceBorderColor : 'none'}
                  strokeWidth={sliceBorderW}
                />
                {labelsOn && (
                  <text
                    x={lp.x}
                    y={lp.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={dlColor}
                    fontSize={dlSize}
                    fontFamily={dlFamily}
                    fontWeight={dlWeight}
                    pointerEvents="none"
                  >
                    {sliceLabel(s)}
                  </text>
                )}
              </g>
            );
          })}
        </Zone>
        <ChartOverlays config={config} st={st} width={width} zIndexFilter="front" />
      </svg>
    </div>
  );
}