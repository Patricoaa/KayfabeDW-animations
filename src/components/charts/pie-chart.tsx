'use client';

import type {ChartConfig} from '@/lib/chart-config';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function PieChart({data, config}: Props) {
  const labelField = config.xField ?? Object.keys(data[0] ?? {})[0] ?? '';
  const valueField = config.yField ?? Object.keys(data[0] ?? {})[1] ?? '';

  const slices = data
    .map((d) => ({label: String(d[labelField] ?? ''), value: Number(d[valueField] ?? 0)}))
    .filter((d) => d.value > 0);

  if (slices.length === 0) {
    return <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Sin datos</div>;
  }

  const total = slices.reduce((s, d) => s + d.value, 0);
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;

  let cumAngle = -Math.PI / 2;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 flex-shrink-0">
        {slices.map((s, i) => {
          const angle = (s.value / total) * 2 * Math.PI;
          const startAngle = cumAngle;
          const endAngle = cumAngle + angle;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const largeArc = angle > Math.PI ? 1 : 0;
          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          const color = config.colors?.[i % (config.colors?.length ?? 12)] ?? '#6366f1';
          cumAngle = endAngle;
          return <path key={i} d={path} fill={color} opacity={0.9} />;
        })}
      </svg>
      <div className="flex flex-col gap-1">
        {slices.slice(0, 12).map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{backgroundColor: config.colors?.[i % (config.colors?.length ?? 12)] ?? '#6366f1'}}
            />
            <span className="text-zinc-400 truncate max-w-[120px]">{s.label}</span>
            <span className="text-zinc-300">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
