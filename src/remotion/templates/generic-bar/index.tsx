import {useCurrentFrame, useVideoConfig, interpolate, spring, Easing} from 'remotion';

export type GenericSeriesItem = {
  label: string;
  value: number;
  color?: string;
};

export type GenericBarProps = {
  title: string;
  series: GenericSeriesItem[];
  numberFormat?: 'short' | 'none' | 'decimal' | 'percent' | 'currency';
};

function fmt(value: number, format: GenericBarProps['numberFormat']): string {
  if (format === 'percent') return `${Math.round(value * 100)}%`;
  if (format === 'currency') return value.toLocaleString('es', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
  if (format === 'decimal') return value.toLocaleString('es', {maximumFractionDigits: 2});
  if (format === 'short') {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  }
  return Math.round(value).toString();
}

export const GenericBar: React.FC<GenericBarProps> = ({title, series, numberFormat}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const items = (series ?? []).slice(0, 20);
  const max = Math.max(...items.map((i) => i.value), 1);

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {extrapolateRight: 'clamp'});
  const titleY = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

  const barHeight = 44;
  const gap = 12;
  const startY = 150;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: 60,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 56,
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: 40,
          letterSpacing: '-0.02em',
        }}
      >
        {title || 'Gráfico'}
      </div>

      {items.map((item, index) => {
        const delay = index * 7;
        const progress = spring({fps, frame: frame - delay, config: {damping: 12, stiffness: 60}});
        const barWidth = (item.value / max) * 1250 * progress;
        const labelOpacity = interpolate(frame - delay, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const y = startY + index * (barHeight + gap);
        const color = item.color ?? '#3b82f6';

        return (
          <div
            key={item.label + index}
            style={{
              position: 'absolute',
              top: y,
              left: 340,
              right: 40,
              height: barHeight,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: -300,
                width: 280,
                opacity: labelOpacity,
                fontSize: 20,
                fontWeight: 600,
                color: '#e0e0e0',
                textAlign: 'right',
                paddingRight: 16,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                flex: 1,
                height: barHeight,
                backgroundColor: '#1a1a1a',
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: barWidth,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: 8,
                  boxShadow: `0 0 20px ${color}40`,
                }}
              />
            </div>
            <div
              style={{
                width: 160,
                opacity: labelOpacity,
                fontSize: 24,
                fontWeight: 700,
                color: '#ffffff',
                textAlign: 'right',
                paddingLeft: 20,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmt(item.value, numberFormat)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
