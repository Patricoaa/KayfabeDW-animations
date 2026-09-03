import {useCurrentFrame, useVideoConfig, interpolate, spring, Easing} from 'remotion';

// Generic horizontal "bar race" item. Each row is one participant/event racing
// from left to right along a shared value scale; rows run in parallel, each
// staggered slightly so they appear one after another.
export type TimelineRaceItem = {
  label: string;       // clear event/participant name
  start: string;       // start / position label
  end: string | null;  // optional end label (null = "current"/open)
  value: number;       // numeric value / duration (positions the bar on the scale)
  secondary: number;   // optional secondary numeric (e.g. defenses)
};

export type TimelineRaceProps = {
  title: string;
  items: TimelineRaceItem[];
  accentColor?: string;
};

export const TimelineRace: React.FC<TimelineRaceProps> = ({
  title,
  items,
  accentColor = '#FFD700',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: 'clamp'});
  const titleY = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

  const race = items.filter((it) => !isNaN(it.value));
  if (race.length === 0) {
    return <div style={{width: '100%', height: '100%', backgroundColor: '#0a0a0a'}} />;
  }

  const maxValue = Math.max(...race.map((it) => it.value), 0);
  const ROW_H = race.length <= 6 ? 110 : Math.max(56, 600 / race.length);
  const maxRows = 9;
  const visible = race.slice(0, maxRows);
  const leading = Math.max(...visible.map((it) => it.value), 0);

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
        paddingBottom: 90,
        boxSizing: 'border-box',
      }}
    >
      <div style={{opacity: fadeIn, transform: `translateY(${titleY}px)`}}>
        <div style={{fontSize: 44, fontWeight: 800, color: '#ffffff'}}>{title || 'Timeline Race'}</div>
        <div style={{marginTop: 14, height: 4, width: 160, backgroundColor: accentColor, borderRadius: 2}} />
      </div>

      {/* Race lanes */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: 40}}>
        {visible.map((item, index) => {
          const delay = 15 + index * 10;
          const isLeader = item.value === leading;
          const rowOpacity = interpolate(frame - delay, [0, 25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const labelX = interpolate(frame - delay, [0, 25], [-24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const barProgress = spring({fps, frame: frame - delay, config: {damping: 18, stiffness: 70}});
          const barWidth = (item.value / maxValue) * 1280 * barProgress;
          const dotScale = spring({fps, frame: frame - delay, config: {damping: 12, stiffness: 90}}) * (isLeader ? 1.25 : 1);

          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                opacity: rowOpacity,
                transform: `translateX(${labelX}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
              }}
            >
              {/* Label */}
              <div style={{width: 300, flexShrink: 0}}>
                <div style={{fontSize: 22, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {item.label}
                </div>
                <div style={{fontSize: 15, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {item.start}{item.end ? ` — ${item.end}` : ''}
                </div>
              </div>

              {/* Bar */}
              <div style={{flex: 1, height: ROW_H * 0.5, backgroundColor: '#1a1a1a', borderRadius: ROW_H * 0.25, overflow: 'hidden', display: 'flex'}}>
                <div style={{
                  width: Math.max(0, barWidth),
                  height: '100%',
                  backgroundColor: isLeader ? accentColor : '#475569',
                  borderRadius: ROW_H * 0.25,
                  boxShadow: isLeader ? `0 0 16px ${accentColor}66` : 'none',
                }} />
              </div>

              {/* Value + marker */}
              <div style={{width: 150, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10}}>
                <span style={{fontSize: 22, fontWeight: 800, color: isLeader ? accentColor : '#ffffff', fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right'}}>
                  {item.value.toLocaleString()}
                </span>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: isLeader ? accentColor : '#334155',
                  border: isLeader ? `3px solid ${accentColor}` : '2px solid #475569',
                  transform: `scale(${dotScale})`,
                  flexShrink: 0,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Value scale axis */}
      <div style={{marginTop: 16, paddingTop: 14, borderTop: '1px solid #1f2937'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#64748b', fontVariantNumeric: 'tabular-nums'}}>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <span key={p}>{Math.round(maxValue * p).toLocaleString()}</span>
          ))}
        </div>
      </div>
    </div>
  );
};