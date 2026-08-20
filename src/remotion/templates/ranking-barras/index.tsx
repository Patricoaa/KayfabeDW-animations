import {useCurrentFrame, useVideoConfig, interpolate, Easing, spring} from 'remotion';

export type RankingBarrasItem = {
  label: string;
  value: number;
  color?: string;
};

export type RankingBarrasProps = {
  title: string;
  items: RankingBarrasItem[];
  maxValue?: number;
};

export const RankingBarras: React.FC<RankingBarrasProps> = ({
  title,
  items,
  maxValue,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const max = maxValue ?? Math.max(...items.map((i) => i.value));
  const barHeight = 60;
  const gap = 20;
  const startY = 180;
  const maxBarWidth = 1200;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

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
          marginBottom: 60,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </div>

      {items.map((item, index) => {
        const delay = index * 8;
        const progress = spring({
          fps,
          frame: frame - delay,
          config: {damping: 12, stiffness: 60},
        });

        const barWidth = (item.value / max) * maxBarWidth * progress;
        const labelOpacity = interpolate(frame - delay, [0, 15], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const valueOpacity = interpolate(frame - delay, [10, 25], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const y = startY + index * (barHeight + gap);

        const displayValue = interpolate(
          frame - delay,
          [10, 40],
          [0, item.value],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          },
        );

        return (
          <div
            key={item.label}
            style={{
              position: 'absolute',
              top: y,
              left: 60,
              right: 60,
              height: barHeight,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 320,
                opacity: labelOpacity,
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
                  backgroundColor: item.color ?? '#3b82f6',
                  borderRadius: 8,
                  boxShadow: `0 0 20px ${item.color ?? '#3b82f6'}40`,
                }}
              />
            </div>

            <div
              style={{
                width: 160,
                opacity: valueOpacity,
                fontSize: 28,
                fontWeight: 700,
                color: '#ffffff',
                textAlign: 'right',
                paddingLeft: 20,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.round(displayValue).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
};
