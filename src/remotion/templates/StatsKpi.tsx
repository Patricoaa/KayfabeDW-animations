import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export type StatsKpiProps = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  description?: string;
  color?: string;
};

export const StatsKpi: React.FC<StatsKpiProps> = ({
  label,
  value,
  suffix = '',
  prefix = '',
  description,
  color = '#3b82f6',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const labelOp = interpolate(frame, [0, 15], [0, 1], {extrapolateRight: 'clamp'});
  const labelY = interpolate(frame, [0, 15], [20, 0], {extrapolateRight: 'clamp'});

  const valueScale = spring({fps, frame: frame - 10, config: {damping: 12, stiffness: 60}});

  const countValue = interpolate(frame, [10, 60], [0, value], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const descOp = interpolate(frame, [30, 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const glowPulse = interpolate(frame, [0, 30, 60], [0, 0.6, 0.3], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          opacity: labelOp,
          transform: `translateY(${labelY}px)`,
          fontSize: 36,
          fontWeight: 600,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 24,
        }}
      >
        {label}
      </div>

      <div
        style={{
          transform: `scale(${valueScale})`,
          fontSize: 160,
          fontWeight: 900,
          color,
          fontVariantNumeric: 'tabular-nums',
          textShadow: `0 0 ${40 * glowPulse}px ${color}60`,
          lineHeight: 1,
        }}
      >
        {prefix}{Math.round(countValue).toLocaleString()}{suffix}
      </div>

      {description && (
        <div
          style={{
            opacity: descOp,
            fontSize: 28,
            color: '#64748b',
            marginTop: 32,
            maxWidth: 800,
            textAlign: 'center',
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
};
