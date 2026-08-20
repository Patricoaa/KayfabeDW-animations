import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

type WrestlerCardProps = {
  name: string;
  title?: string;
  color?: string;
  delay?: number;
  side?: 'left' | 'right';
};

export const WrestlerCard: React.FC<WrestlerCardProps> = ({
  name,
  title,
  color = '#3b82f6',
  delay = 0,
  side = 'left',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const op = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slideX = spring({
    fps,
    frame: frame - delay,
    config: {damping: 15, stiffness: 80},
  });

  const x = side === 'left' ? -30 * slideX : 30 * slideX;

  return (
    <div
      style={{
        opacity: op,
        transform: `translateX(${x}px)`,
        textAlign: side === 'left' ? 'right' : 'left',
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color,
          marginBottom: 8,
        }}
      >
        {name}
      </div>
      {title && (
        <div style={{fontSize: 20, color: '#94a3b8'}}>
          {title}
        </div>
      )}
    </div>
  );
};
