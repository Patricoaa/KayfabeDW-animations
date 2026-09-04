import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile, Easing} from 'remotion';
import {avatarCropRect} from '@/lib/animation-config';

// A date-driven ranked bar race. Each entity has a `date` (timestamp on
// the shared axis). A vertical guide sweeps left→right across the duration;
// when the guide passes an entity's date, its accumulated `value` jumps
// up (spring) and it enters the live ranking (rows re-sort by value each
// frame, highest on top). Before their date they sit in a placeholder zone.
// An optional `image` renders an avatar in the row. When `dateMode` is false,
// it renders a simpler parallel-bar layout (sorted by value, no guide).
//
// The layout is fully responsive: it reads the composition width/height via
// `useVideoConfig()` and re-flows for landscape, portrait (9:16), post (4:5),
// square, and custom sizes. This lets the same template render at any RRSS
// preset while keeping elements proportional.
export type TimelineRaceItem = {
  label: string;              // entity / event name
  image?: string | null;      // optional avatar (url / data: / root-relative)
  date: number | null;        // timestamp ms on the shared axis (null in compat)
  value: number;              // accumulated numeric shown once activated
};

export type TimelineRaceProps = {
  title: string;
  items: TimelineRaceItem[];
  accentColor?: string;
  dateMode?: boolean;
  domain?: [number, number];
  dateFormat?: 'day' | 'month' | 'year';
  maxRows?: number;
  showDateLabel?: boolean;
  showXAxis?: boolean;
  axisPosition?: 'top' | 'bottom';
  rowOrder?: ('bar' | 'value' | 'avatar')[];
  rowGapH?: number;
  rowGap?: number;
  titleX?: number;
  titleY?: number;
  dateX?: number;
  dateY?: number;
  avatarSize?: number;
  avatarShape?: 'circle' | 'rounded';
  avatarRadius?: number;
  avatarCrops?: Record<string, {zoom?: number; focusX?: number; focusY?: number}>;
  barColors?: Record<string, string>;
  background?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
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
  showDateLabel = true,
  showXAxis = true,
  axisPosition = 'bottom',
  rowOrder,
  rowGapH,
  rowGap,
  titleX,
  titleY,
  dateX,
  dateY,
  avatarSize,
  avatarShape = 'circle',
  avatarRadius,
  avatarCrops,
  barColors,
  background = '#0a0a0a',
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width: W, height: H} = useVideoConfig();

  // Validate/expand the row segment order (bar/value/avatar), falling back to a
  // canonical [bar, value, avatar] if the prop is missing or malformed.
  const order = (() => {
    if (!rowOrder || rowOrder.length !== 3) return ['bar', 'value', 'avatar'] as const;
    const uniq = new Set(rowOrder);
    if (uniq.size !== 3 || (!uniq.has('bar') || !uniq.has('value') || !uniq.has('avatar'))) return ['bar', 'value', 'avatar'] as const;
    return rowOrder;
  })();

  // ---- Responsive geometry ----
  const isPortrait = H > W;
  const PAD = isPortrait ? Math.round(W * 0.05) : 56;
  const PAD_T = marginTop ?? PAD;
  const PAD_R = marginRight ?? PAD;
  const PAD_B = marginBottom ?? (isPortrait ? PAD + 40 : 84);
  const PAD_L = marginLeft ?? PAD;
  const TITLE_SIZE = isPortrait ? Math.round(W * 0.075) : 42;
  const ROW_FONT = isPortrait ? Math.round(W * 0.045) : 21;
  const DATE_FONT = isPortrait ? Math.round(W * 0.09) : 44;
  const AVATAR = avatarSize ?? (isPortrait ? Math.round(W * 0.09) : 44);
  const VALUE_W = isPortrait ? Math.round(W * 0.16) : 110;

  const fadeIn = interpolate(frame, [0, 24], [0, 1], {extrapolateRight: 'clamp'});
  const titleDrop = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

  const rows = items.filter((it) => !isNaN(it.value) && it.label !== '');
  if (rows.length === 0) {
    return <div style={{width: '100%', height: '100%', backgroundColor: '#0a0a0a'}} />;
  }

  // ---- compat mode: parallel bars, no timing guide ----
  if (!dateMode) {
    const maxValue = Math.max(...rows.map((it) => it.value), 0);
    const visible = (maxRows && maxRows > 0 ? rows.slice(0, maxRows) : rows).slice(0, 9);
    const leading = Math.max(...visible.map((it) => it.value), 0);
    const barMax = W - VALUE_W - AVATAR - PAD_L - PAD_R - (isPortrait ? 12 : 18) - 24;
    const ROW_H = H * (visible.length <= 6 ? 0.14 : 0.6 / visible.length);
    const winnerScale = interpolate(frame, [durationInFrames - 45, durationInFrames - 10], [1, 1.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return (
      <div style={{width: '100%', height: '100%', backgroundColor: background, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: `${PAD_T}px ${PAD_R}px ${PAD_B}px ${PAD_L}px`, boxSizing: 'border-box'}}>
        <div style={{opacity: fadeIn, transform: `translate(${titleX ?? 0}px, ${(titleY ?? 0) + titleDrop}px)`}}>
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
            const barFill = barColors?.[item.label] ?? (isLeader ? accentColor : '#475569');
            const segments: Record<'bar' | 'value' | 'avatar', React.ReactNode> = {
              bar: (
                <div style={{flex: 1, height: ROW_H * 0.5, backgroundColor: '#1a1a1a', borderRadius: ROW_H * 0.25, overflow: 'hidden', display: 'flex'}}>
                  <div style={{width: Math.max(0, barWidth), height: '100%', backgroundColor: barFill, borderRadius: ROW_H * 0.25, boxShadow: isLeader ? `0 0 ${16 * winnerScale}px ${accentColor}66` : 'none'}} />
                </div>
              ),
              value: (
                <div style={{width: VALUE_W, flexShrink: 0, textAlign: 'right'}}>
                  <span style={{fontSize: ROW_FONT, fontWeight: 800, color: isLeader ? accentColor : '#ffffff', fontVariantNumeric: 'tabular-nums'}}>{item.value.toLocaleString()}</span>
                </div>
              ),
              avatar: (
                <div style={{flexShrink: 0}}>
                  {item.image && <Avatar src={item.image} size={AVATAR} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(item.label)} />}
                </div>
              ),
            };
            return (
              <div key={`${item.label}-${index}`} style={{opacity: rowOpacity, transform: `translateX(${labelX}px) scale(${isLeader ? winnerScale : 1})`, display: 'flex', alignItems: 'center', gap: isPortrait ? 12 : 18}}>
                {order.map((seg) => segments[seg])}
              </div>
            );
          })}
        </div>
        {showXAxis && (
          <div style={{marginTop: 16, paddingTop: 14, borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#64748b', fontVariantNumeric: 'tabular-nums'}}>
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <span key={p}>{Math.round(maxValue * p).toLocaleString()}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- date mode: ranked bar race with sweeping guide ----
  const [min, max] = domain ?? [0, 1];
  const span = Math.max(max - min, 1);
  const withDate = rows.filter((r) => r.date != null);

  // ---- Date axis track geometry (responsive) ----
  // The plot takes the maximum width: bars grow from the left edge, and the
  // numeric value + avatar sit at the right end of each row.
  const innerW = W - PAD_L - PAD_R;
  const ROW_GAP_PX = rowGapH ?? (isPortrait ? 12 : 16);
  const TRACK_LEFT = 0;
  const TRACK_RIGHT = innerW - VALUE_W - AVATAR - ROW_GAP_PX * 2;
  const BAR_MAX_W = Math.max(TRACK_RIGHT - TRACK_LEFT, 1);
  const EASE = 26;
  const sweepFrames = Math.max(durationInFrames - EASE * 2, 1);
  const guideTAt = (f: number) => {
    const r = interpolate(f, [EASE, EASE + sweepFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return r * r * (3 - 2 * r); // smoothstep easing
  };
  const raw = interpolate(frame, [EASE, EASE + sweepFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const guideT = raw * raw * (3 - 2 * raw); // smoothstep time drive

  // ---- Group steps by entity (label) ----
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
  for (const e of byLabel.values()) e.steps.sort((a, b) => a.x - b.x);

  // Ranked entity list at a given sweep progress `t` (0..1). Reused both
  // for the current frame and for a `SWAP`-frame lookback so the row position
  // can glide between the previous and current rank instead of jumping.
  const participantsAt = (t: number) => {
    const list = Array.from(byLabel.entries()).map(([label, e]) => {
      const passed = e.steps.filter((s) => t >= s.x);
      const current = passed.length > 0 ? passed[passed.length - 1].value : 0;
      return {label, image: e.image, current, active: passed.length > 0, firstX: e.steps[0]?.x ?? 1};
    });
    const active = list.filter((p) => p.active).sort((a, b) => b.current - a.current);
    const inactive = list.filter((p) => !p.active).sort((a, b) => b.current - a.current);
    const all = maxRows && maxRows > 0 ? [...active, ...inactive].slice(0, maxRows) : [...active, ...inactive];
    const showInactive = !(maxRows && maxRows > 0 && all.length >= maxRows);
    const visActive = all.filter((p) => p.active);
    const visInactive = showInactive ? all.filter((p) => !p.active) : [];
    return {list: all, visActive, visInactive};
  };

  const currentRank = participantsAt(guideT);
  const {visActive: visibleActive, visInactive: visibleInactive} = currentRank;
  const rowCount = Math.max(visibleActive.length + visibleInactive.length, 1);

  // Current rank (index in the full ordered list) per entity.
  const curIndex = new Map<string, number>();
  currentRank.list.forEach((p, i) => curIndex.set(p.label, i));
  const rankNow = (label: string) => curIndex.get(label) ?? 0;

  // Duration (frames) of the slide when an entity changes rank.
  const SWAP = 24;

  // Detect, for each entity, the most recent rank change within the last
  // `SWAP` frames. When a reorder happens at frame `c`, the row glides from the
  // rank it held just before `c` to its current rank over `SWAP` frames. This is
  // derived purely from `frame` (no React state) so it renders deterministically.
  const evalChange = (label: string) => {
    const now = rankNow(label);
    const from = frame - SWAP > 0 ? frame - SWAP : 0;
    for (let f = frame; f > from; f--) {
      const cur = participantsAt(guideTAt(f)).list.findIndex((p) => p.label === label);
      const prev = participantsAt(guideTAt(f - 1)).list.findIndex((p) => p.label === label);
      if (cur !== prev && prev !== -1) {
        return {atFrame: f, fromRank: prev, nowRank: cur};
      }
    }
    return null;
  };

  // Dynamic x-axis max: the highest accumulated value among the entities
  // already active up to the current sweep position, so the axis (and the bar
  // scale) recalibrate as the race advances instead of staying fixed at the
  // final maximum.
  const currentMax = Math.max(...visibleActive.map((p) => p.current), 0) || 1;

  // Height budget for the rows area: full height minus title, axis strip and padding.
  const rowBudget = H - PAD_T - PAD_B - TITLE_SIZE * 1.4 - (isPortrait ? H * 0.12 : 100) - (isPortrait ? 12 : 36);
  const ROW_H = rowCount <= 6 ? Math.min(rowBudget / rowCount * 0.72, isPortrait ? 150 : 96) : Math.max(52, rowBudget / rowCount * 0.62);
  const ROW_GAP = rowGap ?? (isPortrait ? 14 : 8);

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

  // Per-entity crop; nothing global (zoom/focus are per-entity only).
  const avatarCropFor = (label: string): {zoom: number; focusX: number; focusY: number} => {
    const c = avatarCrops?.[label];
    return {
      zoom: c?.zoom ?? 1,
      focusX: c?.focusX ?? 0,
      focusY: c?.focusY ?? 0,
    };
  };

  const renderRow = (p: {label: string; image?: string | null; current: number; active: boolean; firstX: number}) => {
    const display = p.active ? p.current : 0;
    const isLeader = p.active && visibleActive[0] && p.current === visibleActive[0].current && visibleActive[0].current > 0;
    const barW = (display / currentMax) * BAR_MAX_W * (p.active ? 1 : 0);
    const pop = spring({
      fps,
      frame: p.active ? frame - Math.max(0, Math.floor((p.firstX / 1.001) * sweepFrames)) : frame,
      config: {damping: 22, stiffness: 110},
      durationInFrames: 28,
    });
    const scale = isLeader ? winnerScale : 1;
    const dim = isLeader ? 1 : dimOthers;

    // Slide the whole row (bar + value + avatar) between its rank just before the
    // last reorder and its current rank, easing over `SWAP` frames anchored to
    // the moment the order actually changed.
    const yNow = rowsTop + laneY(rankNow(p.label));
    const change = evalChange(p.label);
    let top = yNow;
    if (change) {
      const sw = Math.min((frame - change.atFrame) / (SWAP - 1), 1);
      top = rowsTop + laneY(change.fromRank) + (yNow - (rowsTop + laneY(change.fromRank))) * Easing.out(Easing.cubic)(Math.max(sw, 0));
    }

    // Bar fill: per-entity override wins; otherwise the leader uses the
    // accent color and the rest a neutral gray.
    const barFill = barColors?.[p.label] ?? (isLeader ? accentColor : '#3f3f46');

    const segments: Record<'bar' | 'value' | 'avatar', React.ReactNode> = {
      bar: (
        <div style={{flex: 1, height: Math.max(14, ROW_H * 0.46), backgroundColor: '#171717', borderRadius: 999, overflow: 'hidden', display: 'flex', position: 'relative'}}>
          <div style={{width: Math.max(0, barW * pop), height: '100%', backgroundColor: barFill, borderRadius: 999, boxShadow: isLeader ? `0 0 ${18 * scale}px ${accentColor}99` : 'none', transform: `scaleY(${scale})`}} />
        </div>
      ),
      value: (
        <div style={{width: VALUE_W, flexShrink: 0, textAlign: 'right'}}>
          <span style={{fontSize: ROW_FONT, fontWeight: 800, color: isLeader ? accentColor : '#ffffff', fontVariantNumeric: 'tabular-nums', opacity: p.active ? 1 : 0.25}}>
            {p.active ? p.current.toLocaleString() : '–'}
          </span>
        </div>
      ),
      avatar: (
        <div style={{flexShrink: 0, textAlign: 'right'}}>
          {p.image && <Avatar src={p.image} size={AVATAR} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(p.label)} />}
        </div>
      ),
    };

    return (
      <div key={p.label} style={{position: 'absolute', left: 0, right: 0, height: ROW_H, top, display: 'flex', alignItems: 'center', gap: ROW_GAP_PX, opacity: dim}}>
        {order.map((seg) => segments[seg])}
      </div>
    );
  };

  // Numeric x-axis: label the extremes of the accumulated value, aligned to the
  // bar track (0 at the left edge of the bars, maxValue at the right edge).
  const dateLabelText = fmtDate(min + span * guideT, dateFormat);
  const axisFont = isPortrait ? Math.round(W * 0.026) : 13;

  const numAxis = (
    <div style={{position: 'relative', flexShrink: 0, marginTop: 8, paddingTop: 12, borderTop: '1px solid #1f2937', width: '100%', height: 22}}>
      <div style={{position: 'absolute', left: TRACK_LEFT - 6, top: 0, fontSize: axisFont, color: '#64748b', fontVariantNumeric: 'tabular-nums'}}>
        {0}
      </div>
      <div style={{position: 'absolute', right: innerW - TRACK_RIGHT - 6, top: 0, fontSize: axisFont, color: '#64748b', fontVariantNumeric: 'tabular-nums', textAlign: 'right'}}>
        {currentMax.toLocaleString()}
      </div>
    </div>
  );

  return (
    <div style={{width: '100%', height: '100%', position: 'relative', backgroundColor: background, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: `${PAD_T}px ${PAD_R}px ${PAD_B}px ${PAD_L}px`, boxSizing: 'border-box', overflow: 'hidden'}}>
      <div style={{opacity: fadeIn, transform: `translate(${titleX ?? 0}px, ${(titleY ?? 0) + titleDrop}px)`, flexShrink: 0}}>
        <div style={{fontSize: TITLE_SIZE, fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{title || 'Timeline Race'}</div>
        <div style={{marginTop: 14, height: 4, width: Math.max(80, W * 0.09), backgroundColor: accentColor, borderRadius: 2}} />
      </div>

      {showXAxis && axisPosition === 'top' && numAxis}

      {/* Rows */}
      <div style={{flex: 1, position: 'relative', marginTop: isPortrait ? H * 0.03 : 36, overflow: 'hidden'}}>
        {visibleActive.map((p) => renderRow(p))}
        {visibleInactive.map((p) => renderRow(p))}
      </div>

      {showXAxis && axisPosition === 'bottom' && numAxis}

      {/* On-screen date (bottom-right, large, plain text) */}
      {showDateLabel && (
        <div style={{position: 'absolute', right: PAD_R, bottom: PAD_B > 30 ? PAD_B : 30, transform: `translate(${dateX ?? 0}px, ${dateY ?? 0}px)`, fontSize: DATE_FONT, fontWeight: 800, color: accentColor, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 20px rgba(0,0,0,0.6)', lineHeight: 1}}>
          {dateLabelText}
        </div>
      )}
    </div>
  );

  function laneY(index: number) {
    return index * (ROW_H + ROW_GAP);
  }
};

function Avatar({
  src,
  size = 44,
  shape = 'circle',
  radius,
  crop,
}: {
  src: string;
  size?: number;
  shape?: 'circle' | 'rounded';
  radius?: number;
  crop?: {zoom?: number; focusX?: number; focusY?: number};
}) {
  const imgSrc = src.startsWith('/') && !src.startsWith('//') ? staticFile(src) : src;
  const rect = avatarCropRect(crop?.zoom, crop?.focusX, crop?.focusY, size);
  const imgX = -rect.w / 2 + rect.dx;
  const imgY = -rect.h / 2 + rect.dy;
  const borderRadius = shape === 'circle' ? '50%' : `${radius ?? Math.round(size * 0.25)}px`;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#1f2937',
        border: '2px solid #334155',
        position: 'relative',
      }}
    >
      <Img
        src={imgSrc}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: rect.w,
          height: rect.h,
          transform: `translate(${imgX}px, ${imgY}px)`,
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
