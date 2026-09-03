import {useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile} from 'remotion';

// A date-driven ranked bar race. Each participant has a `date` (timestamp on
// the shared axis). A vertical guide sweeps left→right across the duration;
// when the guide passes a participant's date, their accumulated `value` jumps
// up (spring) and they enter the live ranking (rows re-sort by value each
// frame, highest on top). Before their date they sit in a placeholder zone.
// An optional `image` renders an avatar in the row. When `dateMode` is false,
// it renders a simpler parallel-bar layout (sorted by value, no guide).
//
// The layout is fully responsive: it reads the composition width/height via
// `useVideoConfig()` and re-flows for landscape, portrait (9:16), post (4:5),
// square, and custom sizes. This lets the same template render at any RRSS
// preset while keeping elements proportional.
export type TimelineRaceItem = {
  label: string;              // participant / event name
  image?: string | null;      // optional avatar (url / data: / root-relative)
  date: number | null;        // timestamp ms on the shared axis (null in compat)
  value: number;              // accumulated numeric shown once the guide passes
};

export type TimelineRaceProps = {
  title: string;
  items: TimelineRaceItem[];
  accentColor?: string;
  dateMode?: boolean;
  domain?: [number, number];
  dateFormat?: 'day' | 'month' | 'year';
  maxRows?: number;
  showYAxis?: boolean;
  showRefLine?: boolean;
  showDateLabel?: boolean;
  axisPosition?: 'top' | 'bottom';
};

function fmtDate(t: number, fmt: TimelineRaceProps['dateFormat'] = 'day'): string {
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  if (fmt === 'year') return String(y);
  if (fmt === 'month') return `${mm}/${y}`;
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}/${mm}/${y}`;
}

export const TimelineRace: React.FC<TimelineRaceProps> = ({
  title,
  items,
  accentColor = '#FFD700',
  dateMode = false,
  domain,
  dateFormat = 'day',
  maxRows,
  showYAxis = true,
  showRefLine = true,
  showDateLabel = true,
  axisPosition = 'bottom',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width: W, height: H} = useVideoConfig();

  // ---- Responsive geometry ----
  const isPortrait = H > W;
  const PAD = isPortrait ? Math.round(W * 0.05) : 56;
  const TITLE_SIZE = isPortrait ? Math.round(W * 0.075) : 42;
  const ROW_FONT = isPortrait ? Math.round(W * 0.045) : 21;
  const DATE_FONT = isPortrait ? Math.round(W * 0.09) : 44;
  const AVATAR = isPortrait ? Math.round(W * 0.09) : 44;
  const LABEL_W = showYAxis ? (isPortrait ? Math.round(W * 0.3) : 320) : 40;
  const VALUE_W = isPortrait ? Math.round(W * 0.16) : 110;

  const fadeIn = interpolate(frame, [0, 24], [0, 1], {extrapolateRight: 'clamp'});
  const titleY = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

  const rows = items.filter((it) => !isNaN(it.value) && it.label !== '');
  if (rows.length === 0) {
    return <div style={{width: '100%', height: '100%', backgroundColor: '#0a0a0a'}} />;
  }

  // ---- compat mode: parallel bars, no timing guide ----
  if (!dateMode) {
    const maxValue = Math.max(...rows.map((it) => it.value), 0);
    const visible = (maxRows && maxRows > 0 ? rows.slice(0, maxRows) : rows).slice(0, 9);
    const leading = Math.max(...visible.map((it) => it.value), 0);
    const barMax = W - LABEL_W - VALUE_W - PAD * 2 - 36;
    const ROW_H = H * (visible.length <= 6 ? 0.14 : 0.6 / visible.length);
    const winnerScale = interpolate(frame, [durationInFrames - 45, durationInFrames - 10], [1, 1.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return (
      <div style={{width: '100%', height: '100%', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: PAD, paddingBottom: PAD * 1.5, boxSizing: 'border-box'}}>
        <div style={{opacity: fadeIn, transform: `translateY(${titleY}px)`}}>
          <div style={{fontSize: TITLE_SIZE, fontWeight: 800, color: '#ffffff'}}>{title || 'Timeline Race'}</div>
          <div style={{marginTop: 14, height: 4, width: Math.max(80, W * 0.09), backgroundColor: accentColor, borderRadius: 2}} />
        </div>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: H * 0.04}}>
          {visible.map((item, index) => {
            const delay = 15 + index * 10;
            const isLeader = item.value === leading;
            const rowOpacity = interpolate(frame - delay, [0, 25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const labelX = interpolate(frame - delay, [0, 25], [-24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const barProgress = spring({fps, frame: frame - delay, config: {damping: 18, stiffness: 70}});
            const barWidth = (item.value / maxValue) * barMax * barProgress;
            return (
              <div key={`${item.label}-${index}`} style={{opacity: rowOpacity, transform: `translateX(${labelX}px) scale(${isLeader ? winnerScale : 1})`, display: 'flex', alignItems: 'center', gap: isPortrait ? 12 : 18}}>
                <div style={{width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12}}>
                  {item.image && <Avatar src={item.image} size={AVATAR} />}
                  <div style={{minWidth: 0}}>
                    <div style={{fontSize: ROW_FONT, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.label}</div>
                  </div>
                </div>
                <div style={{flex: 1, height: ROW_H * 0.5, backgroundColor: '#1a1a1a', borderRadius: ROW_H * 0.25, overflow: 'hidden', display: 'flex'}}>
                  <div style={{width: Math.max(0, barWidth), height: '100%', backgroundColor: isLeader ? accentColor : '#475569', borderRadius: ROW_H * 0.25, boxShadow: isLeader ? `0 0 ${16 * winnerScale}px ${accentColor}66` : 'none'}} />
                </div>
                <div style={{width: VALUE_W, flexShrink: 0, textAlign: 'right'}}>
                  <span style={{fontSize: ROW_FONT, fontWeight: 800, color: isLeader ? accentColor : '#ffffff', fontVariantNumeric: 'tabular-nums'}}>{item.value.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 16, paddingTop: 14, borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#64748b', fontVariantNumeric: 'tabular-nums'}}>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <span key={p}>{Math.round(maxValue * p).toLocaleString()}</span>
          ))}
        </div>
      </div>
    );
  }

  // ---- date mode: ranked bar race with sweeping guide ----
  const [min, max] = domain ?? [0, 1];
  const span = Math.max(max - min, 1);
  const withDate = rows.filter((r) => r.date != null);
  const maxValue = Math.max(...withDate.map((it) => it.value), 0) || 1;

  // ---- Date axis track geometry (responsive) ----
  const innerW = W - PAD * 2;
  const TRACK_LEFT = LABEL_W;
  const TRACK_RIGHT = innerW - VALUE_W - (isPortrait ? 8 : 24);
  const BAR_MAX_W = TRACK_RIGHT - TRACK_LEFT;
  const EASE = 26;
  const sweepFrames = Math.max(durationInFrames - EASE * 2, 1);
  const raw = interpolate(frame, [EASE, EASE + sweepFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const guideT = raw * raw * (3 - 2 * raw); // smoothstep easing
  const guideX = TRACK_LEFT + guideT * (TRACK_RIGHT - TRACK_LEFT);

  // ---- Group steps by participant (label) ----
  const byLabel = new Map<string, {image?: string | null; steps: {x: number; value: number}[]}>();
  for (const r of withDate) {
    const x = ((r.date as number) - min) / span;
    let entry = byLabel.get(r.label);
    if (!entry) {
      entry = {image: r.image, steps: []};
      byLabel.set(r.label, entry);
    }
    entry.steps.push({x, value: r.value});
  }
  const participants = Array.from(byLabel.entries()).map(([label, e]) => {
    const sorted = [...e.steps].sort((a, b) => a.x - b.x);
    const passed = sorted.filter((s) => guideT >= s.x);
    const current = passed.length > 0 ? passed[passed.length - 1].value : 0;
    const firstX = sorted[0]?.x ?? 1;
    return {
      label,
      image: e.image,
      current,
      active: passed.length > 0,
      firstX,
    };
  });

  const activeP = participants.filter((p) => p.active).sort((a, b) => b.current - a.current);
  const inactiveP = participants.filter((p) => !p.active).sort((a, b) => b.current - a.current);
  const allP = (maxRows && maxRows > 0 ? [...activeP, ...inactiveP].slice(0, maxRows) : [...activeP, ...inactiveP]);
  const showInactive = !(maxRows && maxRows > 0 && allP.length >= maxRows);
  const visibleActive = allP.filter((p) => p.active);
  const visibleInactive = showInactive ? allP.filter((p) => !p.active) : [];
  const rowCount = Math.max(visibleActive.length + visibleInactive.length, 1);

  // Height budget for the rows area: full height minus title, axis strip and padding.
  const rowBudget = H - PAD * 2 - TITLE_SIZE * 1.4 - (isPortrait ? H * 0.12 : 100) - (isPortrait ? 12 : 36);
  const ROW_H = rowCount <= 6 ? Math.min(rowBudget / rowCount * 0.72, isPortrait ? 150 : 96) : Math.max(52, rowBudget / rowCount * 0.62);
  const ROW_GAP = isPortrait ? 14 : 8;

  // Vertical position of rows within the rows container.
  const rowsTop = Math.max(0, (rowBudget - rowCount * ROW_H - (rowCount - 1) * ROW_GAP) / 2);

  // ---- Winner reveal: scale up + glow the leader as the race finishes ----
  const raceFinished = guideT >= 0.99;
  const finishStart = Math.max(0, durationInFrames - 60);
  const winnerT = raceFinished
    ? interpolate(frame, [finishStart, finishStart + 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;
  const winnerScale = 1 + 0.05 * winnerT;
  const dimOthers = 1 - 0.35 * winnerT;

  const renderRow = (p: {label: string; image?: string | null; current: number; active: boolean; firstX: number}, y: number) => {
    const display = p.active ? p.current : 0;
    const isLeader = p.active && visibleActive[0] && p.current === visibleActive[0].current && visibleActive[0].current > 0;
    const barW = (display / maxValue) * BAR_MAX_W * (p.active ? 1 : 0);
    const pop = spring({
      fps,
      frame: p.active ? frame - Math.max(0, Math.floor((p.firstX / 1.001) * sweepFrames)) : frame,
      config: {damping: 22, stiffness: 110},
      durationInFrames: 28,
    });
    const scale = isLeader ? winnerScale : 1;
    const dim = isLeader ? 1 : dimOthers;
    return (
      <div key={p.label} style={{position: 'absolute', left: 0, right: 0, height: ROW_H, top: y, display: 'flex', alignItems: 'center', gap: isPortrait ? 10 : 16, opacity: dim}}>
        <div style={{width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, justifyContent: showYAxis ? 'flex-start' : 'flex-end'}}>
          {showYAxis && (
            <>
              {p.image && <Avatar src={p.image} size={AVATAR} />}
              <div style={{minWidth: 0, flex: 1}}>
                <div style={{fontSize: ROW_FONT, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.label}</div>
              </div>
            </>
          )}
        </div>
        <div style={{flex: 1, height: Math.max(14, ROW_H * 0.46), backgroundColor: '#171717', borderRadius: 999, overflow: 'hidden', display: 'flex', position: 'relative'}}>
          <div style={{width: Math.max(0, barW * pop), height: '100%', backgroundColor: isLeader ? accentColor : '#3f3f46', borderRadius: 999, boxShadow: isLeader ? `0 0 ${18 * scale}px ${accentColor}99` : 'none', transform: `scaleY(${scale})`}} />
        </div>
        <div style={{width: VALUE_W, flexShrink: 0, textAlign: 'right'}}>
          <span style={{fontSize: ROW_FONT, fontWeight: 800, color: isLeader ? accentColor : '#ffffff', fontVariantNumeric: 'tabular-nums', opacity: p.active ? 1 : 0.25}}>
            {p.active ? p.current.toLocaleString() : '–'}
          </span>
        </div>
      </div>
    );
  };

  // ---- Date grid: N cells covering [min, max], filled as the guide passes ----
  const GRID_COUNT = 10;
  const gridCells = Array.from({length: GRID_COUNT}, (_, i) => {
    const t = min + span * (i / GRID_COUNT);
    const passed = guideT >= i / GRID_COUNT;
    return {t, passed};
  });

  // On-screen date text (bottom-right), independent of the reference line.
  const dateLabelText = fmtDate(min + span * guideT, dateFormat);
  const gridFont = isPortrait ? Math.round(W * 0.028) : 13;

  const axisStrip = (
    <div style={{flexShrink: 0, marginTop: 8, paddingTop: 12, borderTop: '1px solid #1f2937', display: 'grid', gridTemplateColumns: `repeat(${GRID_COUNT}, 1fr)`, gap: 2, width: '100%'}}>
      {gridCells.map((cell, i) => (
        <div key={i} style={{position: 'relative', fontSize: gridFont, color: cell.passed ? accentColor : '#64748b', fontVariantNumeric: 'tabular-nums', textAlign: 'center', backgroundColor: cell.passed ? `${accentColor}1a` : 'transparent', borderRadius: 4, padding: '2px 0'}}>
          {fmtDate(cell.t, dateFormat)}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{width: '100%', height: '100%', position: 'relative', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: PAD, paddingBottom: isPortrait ? PAD + 60 : 84, boxSizing: 'border-box', overflow: 'hidden'}}>
      <div style={{opacity: fadeIn, transform: `translateY(${titleY}px)`, flexShrink: 0}}>
        <div style={{fontSize: TITLE_SIZE, fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{title || 'Timeline Race'}</div>
        <div style={{marginTop: 14, height: 4, width: Math.max(80, W * 0.09), backgroundColor: accentColor, borderRadius: 2}} />
      </div>

      {axisPosition === 'top' && axisStrip}

      {/* Rows */}
      <div style={{flex: 1, position: 'relative', marginTop: isPortrait ? H * 0.03 : 36, overflow: 'hidden'}}>
        {visibleActive.map((p, i) => renderRow(p, rowsTop + laneY(i)))}
        {visibleInactive.map((p, i) => renderRow(p, rowsTop + laneY(visibleActive.length + i)))}

        {/* Sweeping guide line */}
        {showRefLine && (
          <div style={{position: 'absolute', top: 0, bottom: 0, left: guideX, width: 3, backgroundColor: accentColor, boxShadow: `0 0 12px 2px ${accentColor}55`, opacity: 0.9}} />
        )}
      </div>

      {axisPosition === 'bottom' && axisStrip}

      {/* On-screen date (bottom-right, large, plain text) */}
      {showDateLabel && (
        <div style={{position: 'absolute', right: PAD, bottom: isPortrait ? PAD : 30, fontSize: DATE_FONT, fontWeight: 800, color: accentColor, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 20px rgba(0,0,0,0.6)', lineHeight: 1}}>
          {dateLabelText}
        </div>
      )}
    </div>
  );

  function laneY(index: number) {
    return index * (ROW_H + ROW_GAP);
  }
};

function Avatar({src, size = 44}: {src: string; size?: number}) {
  const imgSrc = src.startsWith('/') && !src.startsWith('//') ? staticFile(src) : src;
  return (
    <div style={{width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#1f2937', border: '2px solid #334155'}}>
      <Img src={imgSrc} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    </div>
  );
}
