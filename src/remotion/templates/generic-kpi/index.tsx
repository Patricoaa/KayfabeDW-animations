import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export type GenericSeriesItem = {
  label: string;
  value: number;
  color?: string;
};

export type GenericKpiProps = {
  title: string;
  value: number;
  suffix?: string;
  color?: string;
};

export const GenericKpi: React.FC<GenericKpiProps> = ({title, value, suffix, color}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  const valueIn = spring({fps, frame, config: {damping: 14, stiffness: 70}});
  const valueOpacity = interpolate(frame, [10, 30], [0, 1], {extrapolateRight: 'clamp'});

  const displayValue = interpolate(frame, [12, 50], [0, value], {
    extrapolateLeft: 'clamp',
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
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: 60,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleOpacity) * -20}px)`,
          fontSize: 40,
          fontWeight: 600,
          color: '#c0c0c0',
          textAlign: 'center',
          letterSpacing: '-0.01em',
          marginBottom: 40,
        }}
      >
        {title || 'KPI'}
      </div>
      <div
        style={{
          opacity: valueOpacity,
          transform: `scale(${valueIn})`,
          fontSize: 140,
          fontWeight: 800,
          color: color ?? '#3b82f6',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Math.round(displayValue).toLocaleString()}
        {suffix ? <span style={{fontSize: 60, marginLeft: 12}}>{suffix}</span> : null}
      </div>
    </div>
  );
};
