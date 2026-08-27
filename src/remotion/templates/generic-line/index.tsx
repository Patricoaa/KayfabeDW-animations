import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export type GenericSeriesItem = {
  label: string;
  value: number;
  color?: string;
};

export type GenericLineProps = {
  title: string;
  series: GenericSeriesItem[];
  numberFormat?: 'short' | 'none' | 'decimal' | 'percent' | 'currency';
};

function fmt(value: number, format: GenericLineProps['numberFormat']): string {
  if (format === 'percent') return `${Math.round(value * 100)}%`;
  if (format === 'currency') return value.toLocaleString('es', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
  if (format === 'decimal') return value.toLocaleString('es', {maximumFractionDigits: 2});
  if (format === 'short') {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  }
  return Math.round(value).toString();
}

export const GenericLine: React.FC<GenericLineProps> = ({title, series, numberFormat}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const points = (series ?? []).slice(0, 40);
  const max = Math.max(...points.map((p) => p.value), 1);

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {extrapolateRight: 'clamp'});

  const W = 1800;
  const H = 900;
  const pad = {top: 150, right: 80, bottom: 120, left: 120};
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const toX = (i: number) => pad.left + (i / Math.max(points.length - 1, 1)) * plotW;
  const toY = (v: number) => pad.top + plotH - (v / max) * plotH;

  const reveal = spring({fps, frame, config: {damping: 14, stiffness: 40}});

  const pts = points.map((p, i) => ({x: toX(i), y: toY(p.value)}));
  const cutoff = Math.min(pts.length, Math.floor(pts.length * reveal) + 1);
  const shown = pts.slice(0, cutoff);

  const linePath = shown.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${shown[shown.length - 1]?.x ?? pad.left} ${pad.top + plotH} L ${pad.left} ${pad.top + plotH} Z`;

  const color = points[0]?.color ?? '#3b82f6';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <text x={pad.left} y={pad.top - 40} fill="#ffffff" fontSize={64} fontWeight={800} opacity={titleOpacity}>
        {title || 'Tendencia'}
      </text>

      {points.map((p, i) => (
        <text
          key={i}
          x={toX(i)}
          y={H - pad.bottom + 30}
          textAnchor="middle"
          fill="#888"
          fontSize={18}
        >
          {p.label.length > 14 ? p.label.slice(0, 14) + '…' : p.label}
        </text>
      ))}

      <path d={areaPath} fill={color} opacity={0.15} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={6} strokeLinejoin="round" />

      {shown.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={8} fill={color} stroke="#111" strokeWidth={3}>
          <title>{`${points[i]?.label ?? ''}: ${fmt(points[i]?.value ?? 0, numberFormat)}`}</title>
        </circle>
      ))}
    </svg>
  );
};
