import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export type TimelineReign = {
  start: string;
  end: string | null;
  days: number;
  defenses: number;
};

export type TimelineReinadosProps = {
  championName: string;
  titleName: string;
  reigns: TimelineReign[];
  promotionColor?: string;
};

export const TimelineReinados: React.FC<TimelineReinadosProps> = ({
  championName,
  titleName,
  reigns,
  promotionColor = '#FFD700',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  const titleY = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

  const totalDays = reigns.reduce((acc, r) => acc + r.days, 0);
  const totalDefenses = reigns.reduce((acc, r) => acc + r.defenses, 0);

  const headerDelay = 0;
  const reignDelay = (i: number) => 30 + i * 15;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
        padding: 60,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 52,
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: 8,
        }}
      >
        {championName}
      </div>
      <div
        style={{
          opacity: titleOpacity,
          fontSize: 28,
          color: promotionColor,
          fontWeight: 600,
          marginBottom: 40,
        }}
      >
        {titleName}
      </div>

      <div style={{display: 'flex', gap: 40, marginBottom: 50}}>
        <StatBox label="Reinados" value={reigns.length} frame={frame} fps={fps} delay={headerDelay} />
        <StatBox label="Días Totales" value={totalDays} frame={frame} fps={fps} delay={headerDelay + 5} />
        <StatBox label="Defensas" value={totalDefenses} frame={frame} fps={fps} delay={headerDelay + 10} />
      </div>

      <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 16}}>
        {reigns.map((reign, i) => {
          const delay = reignDelay(i);
          const op = interpolate(frame - delay, [0, 15], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const slideX = interpolate(frame - delay, [0, 15], [-30, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const isCurrent = reign.end === null;
          const barProgress = interpolate(frame - delay, [5, 35], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const maxDays = Math.max(...reigns.map((r) => r.days));
          const barWidth = (reign.days / maxDays) * 1200 * barProgress;

          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateX(${slideX}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: isCurrent ? promotionColor : '#333',
                border: isCurrent ? `3px solid ${promotionColor}` : '2px solid #555',
                flexShrink: 0,
              }} />

              <div style={{flex: 1}}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <span style={{fontSize: 18, color: '#e0e0e0', fontWeight: 500}}>
                    {reign.start} — {reign.end ?? 'Actual'}
                  </span>
                  <span style={{fontSize: 18, color: '#fff', fontWeight: 700}}>
                    {reign.days} días
                  </span>
                </div>
                <div style={{
                  height: 12,
                  backgroundColor: '#1a1a1a',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: barWidth,
                    height: '100%',
                    backgroundColor: isCurrent ? promotionColor : '#555',
                    borderRadius: 6,
                    boxShadow: isCurrent ? `0 0 12px ${promotionColor}60` : 'none',
                  }} />
                </div>
                <div style={{fontSize: 14, color: '#666', marginTop: 4}}>
                  {reign.defenses} defensas
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function StatBox({label, value, frame, fps, delay}: {
  label: string;
  value: number;
  frame: number;
  fps: number;
  delay: number;
}) {
  const op = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const scale = spring({fps, frame: frame - delay, config: {damping: 12, stiffness: 80}});

  const displayVal = Math.round(interpolate(frame - delay, [0, 40], [0, value], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));

  return (
    <div style={{
      opacity: op,
      transform: `scale(${scale})`,
      backgroundColor: '#1a1a1a',
      borderRadius: 12,
      padding: '16px 32px',
      textAlign: 'center',
    }}>
      <div style={{fontSize: 36, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums'}}>
        {displayVal.toLocaleString()}
      </div>
      <div style={{fontSize: 14, color: '#94a3b8', marginTop: 4}}>
        {label}
      </div>
    </div>
  );
}
