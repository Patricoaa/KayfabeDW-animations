import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile, Easing} from 'remotion';
import {avatarCropRect, type RaceTextStyle} from '@/lib/animation-config';

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
  rowOrder?: ('bar' | 'avatar')[];
  rowGapH?: number;
  rowGap?: number;
  barWidth?: number;
  titleX?: number;
  titleY?: number;
  dateX?: number;
  dateY?: number;
  avatarSize?: number;
  avatarShape?: 'circle' | 'rounded';
  avatarRadius?: number;
  avatarCrops?: Record<string, {zoom?: number; focusX?: number; focusY?: number}>;
  barColors?: Record<string, string>;
  barRadius?: number;
  backgroundType?: 'color' | 'pattern' | 'gradient' | 'image';
  background?: string;
  backgroundSecondary?: string;
  backgroundImage?: string;
  backgroundPattern?: 'dots' | 'stripes' | 'grid' | 'checkers';
  backgroundAngle?: number;
  backgroundOpacity?: number;
  backgroundBlur?: number;
  backgroundFit?: 'cover' | 'contain' | 'fill';
  showYAxis?: boolean;
  yAxisColor?: string;
  yAxisWidth?: number;
  titleText?: RaceTextStyle;
  dateText?: RaceTextStyle;
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

// Merge a RaceTextStyle override onto concrete defaults into a CSSProperties
// subset, dropping undefined so the default wins when not configured.
function textStyle(over: RaceTextStyle | undefined, defaults: {color: string; size: number; weight: number}) {
  const s: React.CSSProperties = {
    color: over?.color ?? defaults.color,
    fontSize: over?.size ?? defaults.size,
    fontWeight: over?.weight ?? defaults.weight,
  };
  if (over?.fontFamily) s.fontFamily = over.fontFamily;
  if (over?.textTransform && over.textTransform !== 'none') s.textTransform = over.textTransform;
  if (over?.letterSpacing !== undefined) s.letterSpacing = over.letterSpacing;
  if (over?.lineHeight) s.lineHeight = over.lineHeight;
  if (over?.align) s.textAlign = over.align;
  return s;
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
  barWidth,
  titleX,
  titleY,
  dateX,
  dateY,
  avatarSize,
  avatarShape = 'circle',
  avatarRadius,
  avatarCrops,
  barColors,
  barRadius,
  backgroundType = 'color',
  background = '#0a0a0a',
  backgroundSecondary = '#1f2937',
  backgroundImage,
  backgroundPattern = 'dots',
  backgroundAngle = 135,
  backgroundOpacity = 1,
  backgroundBlur = 0,
  backgroundFit = 'cover',
  showYAxis = false,
  yAxisColor = '#334155',
  yAxisWidth = 2,
  titleText,
  dateText,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width: W, height: H} = useVideoConfig();

  // Date mode drops the value, which is pinned to the bar's right end. Date mode
  // order only covers the bar and avatar segments.
  const order = (() => {
    const segs: ('bar' | 'avatar')[] = ['bar', 'avatar'];
    if (!rowOrder) return segs;
    const clean = Array.from(new Set(rowOrder.filter((s) => s === 'bar' || s === 'avatar'))) as ('bar' | 'avatar')[];
    return clean.length === 2 ? clean : segs;
  })();
  // Compat mode keeps the original three-segment order (bar/value/avatar) so its
  // behavior is unchanged: the value is auto-inserted right after the bar.
  const orderCompat = (() => {
    const segs: ('bar' | 'value' | 'avatar')[] = [];
    for (const s of order) {
      if (s === 'bar') {
        if (!segs.includes('bar')) segs.push('bar', 'value');
      } else if (s === 'avatar') {
        if (!segs.includes('avatar')) segs.push('avatar');
      }
    }
    if (!segs.includes('bar')) segs.unshift('bar', 'value');
    if (!segs.includes('avatar')) segs.push('avatar');
    return segs;
  })();

  // ---- Responsive geometry ----
  const isPortrait = H > W;
  const PAD = isPortrait ? Math.round(W * 0.05) : 56;
  const PAD_T = PAD;
  const PAD_R = PAD;
  const PAD_B = isPortrait ? PAD + 40 : 84;
  const PAD_L = PAD;
  const TITLE_SIZE = isPortrait ? Math.round(W * 0.075) : 42;
  const ROW_FONT = isPortrait ? Math.round(W * 0.045) : 21;
  const DATE_FONT = isPortrait ? Math.round(W * 0.09) : 44;
  const COMPAT_AVATAR = avatarSize ?? (isPortrait ? Math.round(W * 0.09) : 44);
  const COMPAT_VALUE_W = isPortrait ? Math.round(W * 0.16) : 110;

  const fadeIn = interpolate(frame, [0, 24], [0, 1], {extrapolateRight: 'clamp'});
  const titleDrop = spring({fps, frame, config: {damping: 15, stiffness: 80}}) * -20;

  const rows = items.filter((it) => !isNaN(it.value) && it.label !== '');
  if (rows.length === 0) {
    return <div style={{width: '100%', height: '100%', backgroundColor: '#0a0a0a'}} />;
  }

  // ---- Canvas background layer (solid / pattern / gradient / image) ----
  const bgStyle: React.CSSProperties = (() => {
    let img: string | undefined;
    if (backgroundType === 'color') {
      return {backgroundColor: background};
    }
    if (backgroundType === 'image' && backgroundImage) {
      img = backgroundImage;
      const size =
        backgroundFit === 'contain' ? 'contain' : backgroundFit === 'fill' ? '100% 100%' : 'cover';
      return {
        backgroundColor: background,
        backgroundImage: `url(${img})`,
        backgroundSize: size,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    if (backgroundType === 'gradient') {
      return {
        background: `linear-gradient(${backgroundAngle ?? 135}deg, ${background}, ${backgroundSecondary ?? '#1f2937'})`,
      };
    }
    // pattern
    const fg = background;
    if (backgroundPattern === 'dots') {
      return {
        backgroundColor: '#000',
        backgroundImage: `radial-gradient(${fg} 22%, transparent 24%)`,
        backgroundSize: '26px 26px',
        backgroundPosition: '0 0',
      };
    }
    if (backgroundPattern === 'grid') {
      return {
        backgroundColor: '#000',
        backgroundImage: `linear-gradient(${fg} 1px, transparent 1px), linear-gradient(90deg, ${fg} 1px, transparent 1px)`,
        backgroundSize: '26px 26px',
      };
    }
    if (backgroundPattern === 'checkers') {
      return {
        backgroundColor: '#000',
        backgroundImage: `linear-gradient(45deg, ${fg} 25%, transparent 25%, transparent 75%, ${fg} 75%), linear-gradient(45deg, ${fg} 25%, transparent 25%, transparent 75%, ${fg} 75%)`,
        backgroundSize: '26px 26px',
        backgroundPosition: '0 0, 13px 13px',
      };
    }
    // stripes
    return {
      backgroundColor: '#000',
      backgroundImage: `repeating-linear-gradient(${backgroundAngle ?? 45}deg, ${fg} 0 10px, transparent 10px 22px)`,
    };
  })();
  const bgLayer = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        ...bgStyle,
        opacity: backgroundOpacity ?? 1,
        filter: backgroundBlur ? `blur(${backgroundBlur}px)` : undefined,
      }}
    />
  );

  // ---- compat mode: parallel bars, no timing guide ----
  if (!dateMode) {
    const maxValue = Math.max(...rows.map((it) => it.value), 0);
    const visible = (maxRows && maxRows > 0 ? rows.slice(0, maxRows) : rows).slice(0, 9);
    const leading = Math.max(...visible.map((it) => it.value), 0);
    const barMax = W - COMPAT_VALUE_W - COMPAT_AVATAR - PAD_L - PAD_R - (isPortrait ? 12 : 18) - 24;
    const ROW_H = H * (visible.length <= 6 ? 0.14 : 0.6 / visible.length);
    const winnerScale = interpolate(frame, [durationInFrames - 45, durationInFrames - 10], [1, 1.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return (
      <div style={{width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: `${PAD_T}px ${PAD_R}px ${PAD_B}px ${PAD_L}px`, boxSizing: 'border-box'}}>
        {bgLayer}
        <div style={{opacity: fadeIn, transform: `translate(${titleX ?? 0}px, ${(titleY ?? 0) + titleDrop}px)`, zIndex: 1}}>
          <div style={{...textStyle(titleText, {color: '#ffffff', size: TITLE_SIZE, weight: 800}), whiteSpace: 'pre-line'}}>{title || 'Timeline Race'}</div>
          <div style={{marginTop: 14, height: 4, width: Math.max(80, W * 0.09), backgroundColor: accentColor, borderRadius: 2}} />
        </div>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: H * 0.04, zIndex: 1}}>
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
                <div style={{flex: 1, height: ROW_H * 0.5, backgroundColor: '#1a1a1a', borderRadius: barRadius ?? ROW_H * 0.25, overflow: 'hidden', display: 'flex'}}>
                  <div style={{width: Math.max(0, barWidth), height: '100%', backgroundColor: barFill, borderRadius: barRadius ?? ROW_H * 0.25, boxShadow: isLeader ? `0 0 ${16 * winnerScale}px ${accentColor}66` : 'none'}} />
                </div>
              ),
              value: (
                <div style={{width: COMPAT_VALUE_W, flexShrink: 0, textAlign: 'right'}}>
                  <span style={{fontSize: ROW_FONT, fontWeight: 800, color: isLeader ? accentColor : '#ffffff', fontVariantNumeric: 'tabular-nums'}}>{item.value.toLocaleString()}</span>
                </div>
              ),
              avatar: (
                <div style={{flexShrink: 0}}>
                  {item.image && <Avatar src={item.image} size={COMPAT_AVATAR} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(item.label)} />}
                </div>
              ),
            };
            return (
              <div key={`${item.label}-${index}`} style={{opacity: rowOpacity, transform: `translateX(${labelX}px) scale(${isLeader ? winnerScale : 1})`, display: 'flex', alignItems: 'center', gap: isPortrait ? 12 : 18}}>
                {orderCompat.map((seg) => segments[seg])}
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
  // The value (dato) is pinned to the bar's right end, so the row splits into
  // just two flex segments: the bar track (~barWidth fraction) and the avatar.
  // A single ~3% separation sits between them; the rest of the width is the avatar.
  const innerW = W - PAD_L - PAD_R;
  const ROW_GAP_PX = rowGapH ?? innerW * 0.03;
  const BAR_RATIO = Math.min(Math.max(barWidth ?? 0.75, 0.1), 0.95);
  const BAR_MAX_W = Math.max(innerW * BAR_RATIO, 1);
  const AVATAR = avatarSize ?? Math.max(innerW - BAR_MAX_W - ROW_GAP_PX, 0);
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
    const full = [...active, ...inactive];
    const all = maxRows && maxRows > 0 ? full.slice(0, maxRows) : full;
    const showInactive = !(maxRows && maxRows > 0 && all.length >= maxRows);
    const visActive = all.filter((p) => p.active);
    const visInactive = showInactive ? all.filter((p) => !p.active) : [];
    return {list: all, full, visActive, visInactive};
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

  // Whether `label` is inside the visible top-N window at sweep progress `t`.
  const insideAt = (t: number, label: string) =>
    participantsAt(t).list.some((q) => q.label === label);
  // Full (untrimmed) rank of `label` at a given frame.
  const rankFullAt = (f: number, label: string) =>
    participantsAt(guideTAt(f)).full.findIndex((q) => q.label === label);

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

    // The frame (if within the last `SWAP`) at which `label` crossed in or out
    // of the visible top-N window. Mirrors the ranking `evalChange` scan.
    const evalBoundary = (label: string) => {
      if (!(maxRows && maxRows > 0)) return null;
      const from = frame - SWAP > 0 ? frame - SWAP : 0;
      for (let f = frame; f > from; f--) {
        const inNow = insideAt(guideTAt(f), label);
        const inPrev = insideAt(guideTAt(f - 1), label);
        if (inNow !== inPrev) {
          return inNow
            ? {atFrame: f, entering: true as const, fromRank: -1, nowRank: rankFullAt(f, label)}
            : {atFrame: f, entering: false as const, fromRank: rankFullAt(f - 1, label), nowRank: -1};
        }
      }
      return null;
    };

    // Lane just past the last visible row; exiting/entering rows glide from/to here.
    const belowLane = rowCount;

    // Base ranking glide (unchanged): slide between the rank just before the last
    // reorder and the current rank, easing over `SWAP` frames.
    const yNow = rowsTop + laneY(rankNow(p.label));
    const change = evalChange(p.label);
    let top = yNow;
    let rowOpacity = dim;
    if (change) {
      const sw = Math.min((frame - change.atFrame) / (SWAP - 1), 1);
      top = rowsTop + laneY(change.fromRank) + (yNow - (rowsTop + laneY(change.fromRank))) * Easing.out(Easing.cubic)(Math.max(sw, 0));
    }

    // Smooth entry/exit when the top-N limit makes an entity cross the window
    // boundary: fade (0->1 enter, 1->0 exit) while gliding vertically from/to
    // the lane just below the last visible row.
    const bnd = evalBoundary(p.label);
    if (bnd) {
      const sw = Math.min((frame - bnd.atFrame) / (SWAP - 1), 1);
      const ease = Easing.out(Easing.cubic)(Math.max(sw, 0));
      if (bnd.entering) {
        const fromY = rowsTop + laneY(belowLane);
        const toY = rowsTop + laneY(bnd.nowRank);
        top = fromY + (toY - fromY) * ease;
        rowOpacity = dim * ease;
      } else {
        const fromY = rowsTop + laneY(bnd.fromRank);
        const toY = rowsTop + laneY(belowLane);
        top = fromY + (toY - fromY) * ease;
        rowOpacity = dim * (1 - ease);
      }
    }

    // Bar fill: per-entity override wins; otherwise the leader uses the
    // accent color and the rest a neutral gray.
    const barFill = barColors?.[p.label] ?? (isLeader ? accentColor : '#3f3f46');

    const segments: Record<'bar' | 'avatar', React.ReactNode> = {
      bar: (
        <div style={{flexShrink: 0, width: BAR_MAX_W, height: Math.max(14, ROW_H * 0.46), backgroundColor: '#171717', borderRadius: barRadius ?? 999, overflow: 'visible', display: 'flex', position: 'relative', alignItems: 'center'}}>
          <div style={{width: Math.max(0, barW * pop), height: '100%', backgroundColor: barFill, borderRadius: barRadius ?? 999, boxShadow: isLeader ? `0 0 ${18 * scale}px ${accentColor}99` : 'none', transform: `scaleY(${scale})`}} />
          <div style={{position: 'absolute', right: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none'}}>
            <span style={{fontSize: ROW_FONT, fontWeight: 800, color: '#ffffff', background: 'rgba(0,0,0,0.55)', padding: '2px 8px', borderRadius: 6, fontVariantNumeric: 'tabular-nums', opacity: p.active ? 1 : 0.25, whiteSpace: 'nowrap'}}>
              {p.active ? p.current.toLocaleString() : '–'}
            </span>
          </div>
        </div>
      ),
      avatar: (
        <div style={{width: AVATAR, flexShrink: 0, textAlign: 'right'}}>
          {p.image && <Avatar src={p.image} size={AVATAR} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(p.label)} />}
        </div>
      ),
    };

    return (
      <div key={p.label} style={{position: 'absolute', left: 0, right: 0, height: ROW_H, top, display: 'flex', alignItems: 'center', gap: ROW_GAP_PX, opacity: rowOpacity}}>
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
      <div style={{position: 'absolute', left: -6, top: 0, fontSize: axisFont, color: '#64748b', fontVariantNumeric: 'tabular-nums'}}>
        {0}
      </div>
      <div style={{position: 'absolute', left: BAR_MAX_W - 6, top: 0, fontSize: axisFont, color: '#64748b', fontVariantNumeric: 'tabular-nums', textAlign: 'right'}}>
        {currentMax.toLocaleString()}
      </div>
    </div>
  );

  // Rows to render = the current top-N window plus any entity still mid-way out
  // of the window (exited within the last SWAP frames and still fading/gliding).
  const windowLabels = new Set(currentRank.list.map((q) => q.label));
  const renderPool =
    maxRows && maxRows > 0
      ? currentRank.full.filter((q) => {
          if (windowLabels.has(q.label)) return true;
          const from = frame - SWAP > 0 ? frame - SWAP : 0;
          for (let f = frame; f > from; f--) {
            if (insideAt(guideTAt(f), q.label)) return true;
          }
          return false;
        })
      : currentRank.full;

  return (
    <div style={{width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: `${PAD_T}px ${PAD_R}px ${PAD_B}px ${PAD_L}px`, boxSizing: 'border-box', overflow: 'hidden'}}>
      {bgLayer}
      <div style={{opacity: fadeIn, transform: `translate(${titleX ?? 0}px, ${(titleY ?? 0) + titleDrop}px)`, flexShrink: 0, position: 'relative', zIndex: 1}}>
        <div style={{...textStyle(titleText, {color: '#ffffff', size: TITLE_SIZE, weight: 800}), whiteSpace: 'pre-line'}}>{title || 'Timeline Race'}</div>
        <div style={{marginTop: 14, height: 4, width: Math.max(80, W * 0.09), backgroundColor: accentColor, borderRadius: 2}} />
      </div>

      {showXAxis && axisPosition === 'top' && <div style={{position: 'relative', zIndex: 1}}>{numAxis}</div>}

      {/* Rows */}
      <div style={{flex: 1, position: 'relative', marginTop: isPortrait ? H * 0.03 : 36, overflow: 'hidden'}}>
        {showYAxis && (
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: yAxisWidth ?? 2, borderRadius: 1, backgroundColor: yAxisColor ?? '#334155', zIndex: 0}} />
        )}
        <div style={{position: 'absolute', inset: 0}}>{renderPool.map((p) => renderRow(p))}</div>
      </div>

      {showXAxis && axisPosition === 'bottom' && <div style={{position: 'relative', zIndex: 1}}>{numAxis}</div>}

      {/* On-screen date (bottom-right, large, plain text) */}
      {showDateLabel && (
        <div style={{position: 'absolute', right: PAD_R, bottom: PAD_B > 30 ? PAD_B : 30, transform: `translate(${dateX ?? 0}px, ${dateY ?? 0}px)`, ...textStyle(dateText, {color: accentColor, size: DATE_FONT, weight: 800}), fontVariantNumeric: 'tabular-nums', textShadow: '0 0 20px rgba(0,0,0,0.6)', lineHeight: dateText?.lineHeight ?? 1}}>
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
