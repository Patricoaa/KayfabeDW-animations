import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export type WinStreakProps = {
  wrestlerName: string;
  streakCount: number;
  matchType?: string;
  events?: string[];
  promotionColor?: string;
};

export const WinStreak: React.FC<WinStreakProps> = ({
  wrestlerName,
  streakCount,
  matchType = 'Singles',
  events = [],
  promotionColor = '#FFD700',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  const headerY = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

  const countScale = spring({fps, frame: frame - 15, config: {damping: 10, stiffness: 50}});

  const countDisplay = Math.round(
    interpolate(frame, [15, 70], [0, streakCount], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    }),
  );

  const streakOp = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const dotCount = Math.min(streakCount, 30);

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
        padding: 80,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          opacity: headerOp,
          transform: `translateY(${headerY}px)`,
          fontSize: 48,
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: 8,
        }}
      >
        {wrestlerName}
      </div>
      <div
        style={{
          opacity: headerOp,
          fontSize: 22,
          color: '#64748b',
          marginBottom: 48,
        }}
      >
        Racha de victorias — {matchType}
      </div>

      <div
        style={{
          transform: `scale(${countScale})`,
          fontSize: 200,
          fontWeight: 900,
          color: promotionColor,
          lineHeight: 1,
          textShadow: `0 0 60px ${promotionColor}40`,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {countDisplay}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12,
          marginTop: 48,
          maxWidth: 600,
        }}
      >
        {Array.from({length: Math.min(dotCount, 30)}).map((_, i) => {
          const delay = 70 + i * 2;
          const dotOp = interpolate(frame - delay, [0, 8], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <div
              key={i}
              style={{
                opacity: dotOp,
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: promotionColor,
                boxShadow: `0 0 8px ${promotionColor}60`,
              }}
            />
          );
        })}
      </div>

      {events.length > 0 && (
        <div
          style={{
            opacity: streakOp,
            marginTop: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {events.slice(0, 5).map((event, i) => (
            <div key={i} style={{fontSize: 18, color: '#94a3b8'}}>
              {event}
            </div>
          ))}
          {events.length > 5 && (
            <div style={{fontSize: 16, color: '#475569'}}>
              +{events.length - 5} más
            </div>
          )}
        </div>
      )}
    </div>
  );
};
