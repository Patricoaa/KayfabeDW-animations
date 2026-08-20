import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

type AnimatedBarProps = {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  delay?: number;
  maxBarWidth?: number;
  barHeight?: number;
  showValue?: boolean;
  formatValue?: (v: number) => string;
};

export const AnimatedBar: React.FC<AnimatedBarProps> = ({
  label,
  value,
  maxValue,
  color = '#3b82f6',
  delay = 0,
  maxBarWidth = 1200,
  barHeight = 60,
  showValue = true,
  formatValue,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const progress = spring({
    fps,
    frame: frame - delay,
    config: {damping: 12, stiffness: 60},
  });

  const barWidth = maxValue > 0 ? (value / maxValue) * maxBarWidth * progress : 0;

  const labelOp = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const valueOp = interpolate(frame - delay, [10, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const displayValue = interpolate(frame - delay, [10, 40], [0, value], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const display = formatValue
    ? formatValue(Math.round(displayValue))
    : Math.round(displayValue).toLocaleString();

  return (
    <div
      style={{
        height: barHeight,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 320,
          opacity: labelOp,
          fontSize: 24,
          fontWeight: 600,
          color: '#e0e0e0',
          textAlign: 'right',
          paddingRight: 20,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
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

      {showValue && (
        <div
          style={{
            width: 160,
            opacity: valueOp,
            fontSize: 28,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'right',
            paddingLeft: 20,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {display}
        </div>
      )}
    </div>
  );
};
