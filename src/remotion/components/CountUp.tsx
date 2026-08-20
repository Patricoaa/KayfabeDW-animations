import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

type CountUpProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  formatValue?: (v: number) => string;
};

export const CountUp: React.FC<CountUpProps> = ({
  value,
  prefix = '',
  suffix = '',
  delay = 0,
  fontSize = 160,
  color = '#ffffff',
  formatValue,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const scale = spring({
    fps,
    frame: frame - delay,
    config: {damping: 12, stiffness: 60},
  });

  const countValue = interpolate(frame - delay, [0, 50], [0, value], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const display = formatValue
    ? formatValue(Math.round(countValue))
    : Math.round(countValue).toLocaleString();

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        fontSize,
        fontWeight: 900,
        color,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}
    >
      {prefix}{display}{suffix}
    </div>
  );
};
