import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Img} from 'remotion';
import type {RaceTextStyle, ValueFormat} from '../../../lib/animation-config';
import {ICON_GLYPHS} from '../../../lib/chart-icons';
import {Header} from '../shared/Header';
import {BackgroundLayer} from '../shared/Background';
import {Avatar} from '../shared/Avatar';
import {fmtValue} from '../shared/fmt';
import {textStyle} from '../shared/text';

// A scrolling-plane ranked bar race. Instead of a static guide sweeping over
// fixed bars, the WHOLE plane (bars + axis band) translates horizontally so
// the current time stays pinned under a fixed "now" line (camera following
// the leader). Each entity's bar travels on the axis, stuck by its TIP to its
// position on the passing time axis; the bar grows proportionally to its
// accumulated value. The axis supports dates (timestamp ms) or plain numbers
// (years, rounds, days) via `axisUnit`. Each active entity drops a MARKER on
// the scrolling axis band at its current step showing the accumulated value
// as a number, an icon (ICON_GLYPHS) or a reference image (its avatar URL).
//
// The layout is fully responsive: it reads the composition width/height via
// `useVideoConfig()` and re-flows for landscape, portrait (9:16), post (4:5),
// square, and custom sizes.
export type RaceScrollingItem = {
  label: string;              // entity / event name
  image?: string | null;      // optional avatar + marker image (url / data: / root-relative)
  pos: number;                // position on the scrolling axis (date ms or plain number)
  value: number;              // accumulated numeric shown once activated
};

export type RaceScrollingProps = {
  title: string;
  items: RaceScrollingItem[];
  accentColor?: string;
  dateMode?: boolean;
  domain?: [number, number];
  dateFormat?: 'day' | 'month' | 'year';
  axisUnit?: 'date' | 'number';
  maxRows?: number;
  holdFinalSeconds?: number;
  raceDurationSeconds?: number;
  podiumEffect?: boolean;
  showRail?: boolean;
  barsX?: number;
  barsY?: number;
  showDateLabel?: boolean;
  showXAxis?: boolean;
  axisPosition?: 'top' | 'bottom';
  // Camera anchor: % of the track width where the "now" line stays fixed
  // (5-95, default 35). The plane scrolls so this point always matches `now`.
  anchorX?: number;
  // Number of ticks drawn on the scrolling axis band (2-24, default 8).
  axisTicks?: number;
  // Per-entity markers on the scrolling axis band: number / icon / image.
  showMarkers?: boolean;
  markerMode?: 'number' | 'icon' | 'image';
  markerIcon?: string;
  markerSize?: number;
  markerText?: RaceTextStyle;
  rowOrder?: ('bar' | 'avatar')[];
  rowGapH?: number;
  rowGap?: number;
  barWidth?: number;
  titleX?: number;
  titleY?: number;
  subtitle?: string;
  subtitleText?: RaceTextStyle;
  subtitleX?: number;
  subtitleY?: number;
  dateX?: number;
  dateY?: number;
  showAvatar?: boolean;
  avatarSize?: number;
  avatarShape?: 'circle' | 'rounded';
  avatarRadius?: number;
  avatarCrops?: Record<string, {zoom?: number; focusX?: number; focusY?: number}>;
  avatarBg?: string;
  avatarBorderColor?: string;
  avatarBorderWidth?: number;
  barColors?: Record<string, string>;
  barRadius?: number;
  barPalette?: string[];
  barThickness?: number;
  valueFormat?: ValueFormat;
  currencySymbol?: string;
  backgroundType?: 'color' | 'pattern' | 'gradient' | 'image';
  background?: string;
  backgroundSecondary?: string;
  backgroundImage?: string;
  backgroundPattern?: 'dots' | 'stripes' | 'grid' | 'checkers';
  backgroundAngle?: number;
  backgroundGradientShape?: 'linear' | 'radial';
  backgroundGradientCenterX?: number;
  backgroundGradientCenterY?: number;
  backgroundGradientRadius?: number;
  backgroundGradientBlend?: number;
  backgroundGradientSmooth?: number;
  backgroundOpacity?: number;
  backgroundBlur?: number;
  backgroundFit?: 'cover' | 'contain' | 'fill';
  backgroundAnim?: 'none' | 'mirror';
  backgroundAnimSpeed?: number;
  showYAxis?: boolean;
  yAxisColor?: string;
  yAxisWidth?: number;
  titleText?: RaceTextStyle;
  dateText?: RaceTextStyle;
  labelText?: RaceTextStyle;
  valueText?: RaceTextStyle;
};

function fmtDate(t: number, fmt: RaceScrollingProps['dateFormat'] = 'day'): string {
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  if (fmt === 'year') return String(y);
  if (fmt === 'month') return `${mm}/${y}`;
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}/${mm}/${y}`;
}

export const RaceScrolling: React.FC<RaceScrollingProps> = ({
  title,
  items,
  accentColor = '#FFD700',
  dateMode = false,
  domain,
  dateFormat = 'day',
  axisUnit = 'date',
  maxRows,
  holdFinalSeconds = 2,
  raceDurationSeconds,
  podiumEffect = true,
  showRail = true,
  barsX,
  barsY,
  showDateLabel = true,
  showXAxis = true,
  axisPosition = 'bottom',
  anchorX = 35,
  axisTicks = 8,
  showMarkers = true,
  markerMode = 'number',
  markerIcon = 'star',
  markerSize,
  markerText,
  rowOrder,
  rowGapH,
  rowGap,
  barWidth,
  titleX,
  titleY,
  subtitle,
  subtitleText,
  subtitleX,
  subtitleY,
  dateX,
  dateY,
  showAvatar = true,
  avatarSize,
  avatarShape = 'circle',
  avatarRadius,
  avatarCrops,
  avatarBg,
  avatarBorderColor,
  avatarBorderWidth,
  barColors,
  barRadius,
  barPalette,
  barThickness,
  valueFormat = 'number',
  currencySymbol = '$',
  backgroundType = 'color',
  background = '#0a0a0a',
  backgroundSecondary = '#1f2937',
  backgroundImage,
  backgroundPattern = 'dots',
  backgroundAngle = 135,
  backgroundGradientShape,
  backgroundGradientCenterX,
  backgroundGradientCenterY,
  backgroundGradientRadius,
  backgroundGradientBlend,
  backgroundGradientSmooth,
  backgroundOpacity = 1,
  backgroundBlur = 0,
  backgroundFit = 'cover',
  backgroundAnim = 'none',
  backgroundAnimSpeed = 60,
  showYAxis = false,
  yAxisColor = '#334155',
  yAxisWidth = 2,
  titleText,
  dateText,
  labelText,
  valueText,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width: W, height: H} = useVideoConfig();

  const order = (() => {
    const segs: ('bar' | 'avatar')[] = ['bar', 'avatar'];
    if (!rowOrder) return segs;
    const clean = Array.from(new Set(rowOrder.filter((s) => s === 'bar' || s === 'avatar'))) as ('bar' | 'avatar')[];
    return clean.length === 2 ? clean : segs;
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

  const rows = items.filter((it) => !isNaN(it.value) && it.label !== '');
  if (rows.length === 0) {
    return <div style={{width: '100%', height: '100%', backgroundColor: '#0a0a0a'}} />;
  }

  // ---- Canvas background layer (solid / pattern / gradient / image) ----
  const bgLayer = (
    <BackgroundLayer
      backgroundType={backgroundType}
      background={background}
      backgroundSecondary={backgroundSecondary}
      backgroundImage={backgroundImage}
      backgroundPattern={backgroundPattern}
      backgroundAngle={backgroundAngle}
      backgroundGradientShape={backgroundGradientShape}
      backgroundGradientCenterX={backgroundGradientCenterX}
      backgroundGradientCenterY={backgroundGradientCenterY}
      backgroundGradientRadius={backgroundGradientRadius}
      backgroundGradientBlend={backgroundGradientBlend}
      backgroundGradientSmooth={backgroundGradientSmooth}
      backgroundOpacity={backgroundOpacity}
      backgroundBlur={backgroundBlur}
      backgroundFit={backgroundFit}
      backgroundAnim={backgroundAnim}
      backgroundAnimSpeed={backgroundAnimSpeed}
    />
  );

  // ---- compat mode: parallel bars ordered by value, no scrolling axis ----
  // (only when neither a date axis nor a numeric axis could be resolved)
  if (!dateMode && axisUnit !== 'number') {
    const maxValue = Math.max(...rows.map((it) => it.value), 0);
    const visible = (maxRows && maxRows > 0 ? rows.slice(0, maxRows) : rows).slice(0, 9);
    const leading = Math.max(...visible.map((it) => it.value), 0);
    const barMax = W - COMPAT_AVATAR - PAD_L - PAD_R - 18 - 24;
    const ROW_H = H * (visible.length <= 6 ? 0.14 : 0.6 / visible.length);
    const winnerScale = interpolate(frame, [durationInFrames - 45, durationInFrames - 10], [1, 1.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return (
      <div style={{width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: `${PAD_T}px ${PAD_R}px ${PAD_B}px ${PAD_L}px`, boxSizing: 'border-box', overflow: 'hidden'}}>
        {bgLayer}
        <Header
          title={title}
          titleX={titleX}
          titleY={titleY}
          titleText={titleText}
          subtitle={subtitle}
          subtitleText={subtitleText}
          subtitleX={subtitleX}
          subtitleY={subtitleY}
          top={PAD_T}
          left={PAD_L}
          titleSize={TITLE_SIZE}
          subSize={Math.max(ROW_FONT, Math.round(TITLE_SIZE / 2))}
          accentColor={accentColor}
          fallbackTitle="Race Scrolling"
        />
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: H * 0.04, zIndex: 1}}>
          {visible.map((item, index) => {
            const delay = 15 + index * 10;
            const isLeader = item.value === leading;
            const rowOpacity = interpolate(frame - delay, [0, 25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const labelX = interpolate(frame - delay, [0, 25], [-24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const barProgress = spring({fps, frame: frame - delay, config: {damping: 18, stiffness: 70}});
            const barWidthPx = (item.value / maxValue) * barMax * barProgress;
            const barFill = barColors?.[item.label] ?? (isLeader ? accentColor : '#475569');
            return (
              <div key={`${item.label}-${index}`} style={{opacity: rowOpacity, transform: `translateX(${labelX}px) scale(${isLeader ? winnerScale : 1})`, display: 'flex', alignItems: 'center', gap: isPortrait ? 12 : 18}}>
                {order[0] === 'avatar' && <div style={{flexShrink: 0}}>{showAvatar && item.image && <Avatar src={item.image} size={COMPAT_AVATAR} shape={avatarShape} radius={avatarRadius} bg={avatarBg} borderColor={avatarBorderColor} borderWidth={avatarBorderWidth} />}</div>}
                <div style={{flex: 1, height: ROW_H * 0.5, backgroundColor: showRail !== false ? '#1a1a1a' : 'transparent', borderRadius: 999, overflow: 'hidden', display: 'flex'}}>
                  <div style={{width: Math.max(0, barWidthPx), height: '100%', backgroundColor: barFill, borderRadius: barRadius ?? 999}} />
                </div>
                <div style={{width: 110, flexShrink: 0, textAlign: 'right'}}>
                  <span style={{fontVariantNumeric: 'tabular-nums', ...textStyle(valueText, {color: isLeader ? accentColor : '#ffffff', size: ROW_FONT, weight: 800})}}>{fmtValue(item.value, valueFormat, currencySymbol)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- scroll mode: ranked bars traveling on the scrolling axis ----
  const [min, max] = domain ?? [0, 1];
  const span = Math.max(max - min, 1);

  const innerW = W - PAD_L - PAD_R;
  const ROW_GAP_PX = rowGapH ?? innerW * 0.03;
  const BAR_RATIO = Math.min(Math.max(barWidth ?? 0.75, 0.1), 0.95);
  const BAR_MAX_W = Math.max(innerW * BAR_RATIO, 1);
  const EASE = 26;
  const OUTRO = Math.min(45, Math.max(0, Math.floor(durationInFrames * 0.12)));
  const sweepBudget = Math.max(0, durationInFrames - EASE * 2 - OUTRO);
  const holdCap = Math.max(0, sweepBudget - 1);
  const holdFinalFrames = Math.max(0, Math.min(Math.round(holdFinalSeconds * fps), holdCap));
  const sweepFrames = raceDurationSeconds != null
    ? Math.max(1, Math.min(Math.max(1, Math.round(raceDurationSeconds * fps)), sweepBudget))
    : Math.max(sweepBudget - holdFinalFrames, 1);
  const holdFrames = raceDurationSeconds != null
    ? (sweepFrames >= sweepBudget ? 0 : Math.max(holdFinalFrames, sweepBudget - sweepFrames))
    : holdFinalFrames;
  const raceEndFrame = EASE + sweepFrames;
  const guideTAt = (f: number) => {
    const r = interpolate(f, [EASE, EASE + sweepFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return r * r * (3 - 2 * r); // smoothstep
  };
  const raw = interpolate(frame, [EASE, EASE + sweepFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const guideT = raw * raw * (3 - 2 * raw);

  // ---- Group steps by entity ----
  const byLabel = new Map<string, {image?: string | null; steps: {x: number; value: number}[]}>();
  for (const r of rows) {
    const x = Math.min(Math.max((r.pos - min) / span, 0), 1);
    let entry = byLabel.get(r.label);
    if (!entry) {
      entry = {image: r.image, steps: []};
      byLabel.set(r.label, entry);
    }
    entry.steps.push({x, value: r.value});
  }
  for (const e of byLabel.values()) e.steps.sort((a, b) => a.x - b.x);

  // ---- Live ranking snapshots, shared per sweep position (see timeline-race) ----
  type Participant = {label: string; image?: string | null; active: boolean; firstX: number; curX: number; current: number};
  type RankSnap = {
    list: Participant[];
    full: Participant[];
    visActive: Participant[];
    visInactive: Participant[];
    window: Set<string>;
    listIndex: Map<string, number>;
    fullIndex: Map<string, number>;
  };

  const buildSnap = (t: number): RankSnap => {
    const list: Participant[] = [];
    for (const [label, e] of byLabel.entries()) {
      const steps = e.steps;
      let i = -1;
      for (let k = 0; k < steps.length; k++) {
        if (t >= steps[k].x) i = k;
        else break;
      }
      const active = i >= 0;
      let current = 0;
      let curX = active ? steps[i].x : (steps[0]?.x ?? 0);
      if (active) {
        const cur = steps[i];
        const nxt = steps[i + 1];
        current = cur.value;
        curX = cur.x;
        if (nxt) {
          const segSpan = Math.max(nxt.x - cur.x, 1e-4);
          const frac = Math.min(1, Math.max(0, (t - cur.x) / segSpan));
          current = cur.value + (nxt.value - cur.value) * frac;
          curX = cur.x + (nxt.x - cur.x) * frac;
        }
      }
      list.push({label, image: e.image, active, firstX: steps[0]?.x ?? 1, curX, current});
    }
    const activeList = list.filter((p) => p.active).sort((a, b) => b.current - a.current);
    const inactiveList = list.filter((p) => !p.active).sort((a, b) => b.current - a.current);
    const full = [...activeList, ...inactiveList];
    const all = maxRows && maxRows > 0 ? full.slice(0, maxRows) : full;
    const showInactive = !(maxRows && maxRows > 0 && all.length >= maxRows);
    const visActive = all.filter((p) => p.active);
    const visInactive = showInactive ? all.filter((p) => !p.active) : [];
    const window = new Set<string>();
    const listIndex = new Map<string, number>();
    const fullIndex = new Map<string, number>();
    all.forEach((p, i) => {
      window.add(p.label);
      listIndex.set(p.label, i);
    });
    full.forEach((p, i) => fullIndex.set(p.label, i));
    return {list: all, full, visActive, visInactive, window, listIndex, fullIndex};
  };

  const snapCache = new Map<number, RankSnap>();
  const rankAtFrame = (f: number): RankSnap => {
    const t = guideTAt(f);
    const cached = snapCache.get(t);
    if (cached) return cached;
    const snap = buildSnap(t);
    snapCache.set(t, snap);
    return snap;
  };

  const currentRank = rankAtFrame(frame);
  const {visActive: visibleActive, visInactive: visibleInactive} = currentRank;
  const rowCount = Math.max(visibleActive.length + visibleInactive.length, 1);

  const rankNow = (label: string) => currentRank.listIndex.get(label) ?? rowCount;
  const SWAP = 24;

  const evalChange = (label: string) => {
    const from = frame - SWAP > 0 ? frame - SWAP : 0;
    for (let f = frame; f > from; f--) {
      const cur = rankAtFrame(f).listIndex.get(label) ?? -1;
      const prev = rankAtFrame(f - 1).listIndex.get(label) ?? -1;
      if (cur !== prev && prev !== -1) {
        return {atFrame: f, fromRank: prev, nowRank: cur};
      }
    }
    return null;
  };

  const insideAt = (f: number, label: string) => rankAtFrame(f).window.has(label);
  const rankFullAt = (f: number, label: string) => rankAtFrame(f).fullIndex.get(label) ?? -1;

  // Dynamic value max over the active entities (recalibrates as the race advances).
  const currentMax = Math.max(...visibleActive.map((p) => p.current), 0) || 1;

  const rowBudget = H - PAD_T - PAD_B - TITLE_SIZE * 1.4 - (isPortrait ? H * 0.12 : 100) - (isPortrait ? 12 : 36);
  const ROW_H = rowCount <= 6 ? Math.min(rowBudget / rowCount * 0.72, isPortrait ? 150 : 96) : Math.max(52, rowBudget / rowCount * 0.62);
  const ROW_GAP = rowGap ?? (isPortrait ? 14 : 8);
  const rowsTop = Math.max(0, (rowBudget - rowCount * ROW_H - (rowCount - 1) * ROW_GAP) / 2);
  const rowsHeight = rowCount * ROW_H + (rowCount - 1) * ROW_GAP;

  const GROOVE_H = barThickness != null ? Math.min(Math.max(4, Math.round(barThickness)), Math.max(12, ROW_H * 0.7)) : Math.max(12, ROW_H * 0.42);
  const BAR_H = GROOVE_H + Math.max(2, Math.round(ROW_H * 0.06));

  // ---- Scrolling plane geometry ----
  const anchorFrac = Math.min(Math.max(anchorX ?? 35, 5), 95) / 100;
  const anchorWorld = anchorFrac * BAR_MAX_W;
  const nowWorld = guideT * BAR_MAX_W;
  const scrollX = anchorWorld - nowWorld;
  const nowLabel = axisUnit === 'date' ? fmtDate(min + span * guideT, dateFormat) : fmtValue(Math.round(min + span * guideT), valueFormat, currencySymbol);

  // ---- Winner reveal + outro ----
  const raceFinished = guideT >= 0.99;
  const finishStart = Math.max(0, raceEndFrame - 12);
  const winnerT = raceFinished
    ? interpolate(frame, [finishStart, finishStart + 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;
  const winnerScale = podiumEffect ? 1 + 0.05 * winnerT : 1;
  const dimOthers = podiumEffect ? 1 - 0.35 * winnerT : 1;

  const outroStart = raceEndFrame + holdFrames;
  const outroEase = interpolate(frame, [outroStart, outroStart + Math.max(1, Math.min(30, OUTRO))], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const outro = Easing.out(Easing.cubic)(Math.max(Math.min(outroEase, 1), 0));
  const FINAL_W = Math.min(
    BAR_MAX_W * 0.9,
    Math.max(48, fmtValue(Math.max(...rows.map((r) => r.value), 0), valueFormat, currencySymbol).length * ROW_FONT * 0.58 + 28),
  );

  const avatarCropFor = (label: string, image?: string | null): {zoom: number; focusX: number; focusY: number} => {
    const c = avatarCrops?.[label] ?? (image ? avatarCrops?.[image] : undefined);
    return {zoom: c?.zoom ?? 1, focusX: c?.focusX ?? 0, focusY: c?.focusY ?? 0};
  };

  const entityOrder = [...byLabel.keys()];
  const palColor = (label: string): string | undefined => {
    if (!barPalette || barPalette.length === 0) return undefined;
    return barPalette[Math.max(0, entityOrder.indexOf(label)) % barPalette.length];
  };

  function laneY(index: number) {
    return index * (ROW_H + ROW_GAP);
  }

  const best = (p: Participant) => visibleActive[0] && p.current === visibleActive[0].current && visibleActive[0].current > 0;
  const isLeader = (p: Participant) => best(p);

  const anchorXPx = PAD_L + anchorWorld;

  // ---- Scrolling axis band (ticks + per-entity markers), travels with the plane ----
  const MARKER_SIZE = markerSize ?? (isPortrait ? Math.round(W * 0.055) : 26);
  const AXIS_FONT = isPortrait ? Math.round(W * 0.026) : 13;
  const BAND_H = showXAxis ? Math.max(40, MARKER_SIZE + 20) : 0;

  const ticks = (() => {
    const n = Math.min(Math.max(Math.round(axisTicks ?? 8), 2), 24);
    const out: {label: string; x: number}[] = [];
    for (let i = 0; i < n; i++) {
      const t = min + (i / (n - 1)) * span;
      out.push({
        label: axisUnit === 'date' ? fmtDate(t, dateFormat) : fmtValue(t, valueFormat, currencySymbol),
        x: ((t - min) / span) * BAR_MAX_W,
      });
    }
    return out;
  })();

  const markerGlyph = ICON_GLYPHS[markerIcon ?? 'star'] ?? ICON_GLYPHS.star;
  const markerFor = (p: Participant) => {
    if (!showMarkers) return null;
    if (markerMode === 'image' && p.image) {
      return (
        <div style={{position: 'absolute', left: p.curX * BAR_MAX_W - MARKER_SIZE / 2, top: '50%', transform: 'translateY(-50%)', width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: Math.max(2, MARKER_SIZE * 0.18), overflow: 'hidden', border: '1px solid rgba(255,255,255,0.28)'}}>
          <Img src={p.image} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
      );
    }
    if (markerMode === 'icon') {
      return (
        <div style={{position: 'absolute', left: p.curX * BAR_MAX_W - MARKER_SIZE / 2, top: '50%', transform: 'translateY(-50%)', width: MARKER_SIZE, height: MARKER_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: barFillOf(p), filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'}}>
          <svg viewBox="0 0 24 24" width={MARKER_SIZE} height={MARKER_SIZE}><path d={markerGlyph} fill="currentColor" /></svg>
        </div>
      );
    }
    return (
      <div style={{position: 'absolute', left: p.curX * BAR_MAX_W, top: '50%', transform: 'translate(-50%, -50%)', ...textStyle(markerText, {color: '#ffffff', size: AXIS_FONT + 2, weight: 700}), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
        {fmtValue(Math.round(p.current), valueFormat, currencySymbol)}
      </div>
    );
  };

  const barFillOf = (p: Participant): string =>
    barColors?.[p.label] ?? (p.image ? barColors?.[p.image] : undefined) ?? palColor(p.label) ?? (isLeader(p) ? accentColor : '#3f3f46');

  const renderRow = (p: Participant) => {
    if (!p.active) return null;
    const display = p.current;
    const rawW = Math.max(0, (display / currentMax) * BAR_MAX_W);
    const pop = spring({
      fps,
      frame: p.active ? frame - Math.max(0, Math.floor((p.firstX / 1.001) * sweepFrames)) : frame,
      config: {damping: 22, stiffness: 110},
      durationInFrames: 28,
    });
    const w = rawW * pop + (FINAL_W - rawW * pop) * outro;
    const tipX = p.curX * BAR_MAX_W;
    const startX = tipX - w;
    const scale = isLeader(p) ? winnerScale : 1;
    const dim = isLeader(p) ? 1 : dimOthers;

    const yNow = rowsTop + laneY(rankNow(p.label));
    const change = evalChange(p.label);
    let top = yNow;
    let rowOpacity = dim;
    if (change) {
      const sw = Math.min((frame - change.atFrame) / (SWAP - 1), 1);
      top = rowsTop + laneY(change.fromRank) + (yNow - (rowsTop + laneY(change.fromRank))) * Easing.out(Easing.cubic)(Math.max(sw, 0));
    }

    const evalBoundary = (label: string) => {
      if (!(maxRows && maxRows > 0)) return null;
      const from = frame - SWAP > 0 ? frame - SWAP : 0;
      for (let f = frame; f > from; f--) {
        const inNow = insideAt(f, label);
        const inPrev = insideAt(f - 1, label);
        if (inNow !== inPrev) {
          return inNow
            ? {atFrame: f, entering: true as const, fromRank: -1, nowRank: rankFullAt(f, label)}
            : {atFrame: f, entering: false as const, fromRank: rankFullAt(f - 1, label), nowRank: -1};
        }
      }
      return null;
    };
    const belowLane = rowCount;
    const bnd = evalBoundary(p.label);
    if (bnd) {
      const sw = Math.min((frame - bnd.atFrame) / (SWAP - 1), 1);
      const ease = Easing.out(Easing.cubic)(Math.max(sw, 0));
      if (bnd.entering) {
        top = rowsTop + laneY(belowLane) + (rowsTop + laneY(bnd.nowRank) - (rowsTop + laneY(belowLane))) * ease;
        rowOpacity = dim * ease;
      } else {
        top = rowsTop + laneY(bnd.fromRank) + (rowsTop + laneY(belowLane) - (rowsTop + laneY(bnd.fromRank))) * ease;
        rowOpacity = dim * (1 - ease);
      }
    }

    const barFill = barFillOf(p);

    const segments: Record<'bar' | 'avatar', React.ReactNode> = {
      bar: (
        <div style={{flexShrink: 0, width: BAR_MAX_W, height: BAR_H, position: 'relative', display: 'flex', alignItems: 'center'}}>
          {showRail !== false && <div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: GROOVE_H, transform: 'translateY(-50%)', backgroundColor: '#171717', borderRadius: barRadius ?? 999, opacity: pop}} />}
          <div style={{position: 'absolute', left: startX, top: '50%', width: Math.max(0, w), height: BAR_H, transform: `translateY(-50%) scaleY(${scale})`, backgroundColor: barFill, borderRadius: barRadius ?? 999, boxShadow: isLeader(p) && podiumEffect ? `0 0 ${18 * scale}px ${accentColor}99` : 'none'}} />
          <div style={{position: 'absolute', right: BAR_MAX_W - tipX + 12, top: 0, bottom: 0, maxWidth: Math.max(0, w - 24), minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden', pointerEvents: 'none', opacity: pop}}>
            <span style={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.45)', ...textStyle(valueText, {color: '#ffffff', size: ROW_FONT, weight: 800})}}>
              {fmtValue(Math.round(p.current), valueFormat, currencySymbol)}
            </span>
          </div>
          <div style={{position: 'absolute', left: startX, top: 0, bottom: 0, width: Math.max(0, w), display: 'flex', alignItems: 'center', opacity: outro}}>
            <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', paddingLeft: 12, paddingRight: 8, ...textStyle(labelText, {color: '#d4d4d8', size: Math.round(ROW_FONT * 0.92), weight: 700})}}>{p.label}</span>
          </div>
        </div>
      ),
      avatar: (
        <div style={{width: Math.max(innerW - BAR_MAX_W - ROW_GAP_PX, 0), flexShrink: 0, textAlign: 'right'}}>
          {showAvatar && p.image && <Avatar src={p.image} size={Math.max(innerW - BAR_MAX_W - ROW_GAP_PX, 0)} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(p.label, p.image)} bg={avatarBg} borderColor={avatarBorderColor} borderWidth={avatarBorderWidth} />}
        </div>
      ),
    };

    return (
      <div key={p.label} style={{position: 'absolute', left: 0, right: 0, height: ROW_H, top, display: 'flex', alignItems: 'center', gap: ROW_GAP_PX, opacity: rowOpacity}}>
        {order.map((seg) => segments[seg])}
      </div>
    );
  };

  const renderPool =
    maxRows && maxRows > 0
      ? currentRank.full.filter((q) => {
          if (currentRank.window.has(q.label)) return true;
          const from = frame - SWAP > 0 ? frame - SWAP : 0;
          for (let f = frame; f > from; f--) {
            if (insideAt(f, q.label)) return true;
          }
          return false;
        })
      : currentRank.full;

  const rowsTopY = axisPosition === 'top' ? BAND_H + 18 : 0;

  return (
    <div style={{width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: `${PAD_T}px ${PAD_R}px ${PAD_B}px ${PAD_L}px`, boxSizing: 'border-box', overflow: 'hidden'}}>
      {bgLayer}
      <Header
        title={title}
        titleX={titleX}
        titleY={titleY}
        titleText={titleText}
        subtitle={subtitle}
        subtitleText={subtitleText}
        subtitleX={subtitleX}
        subtitleY={subtitleY}
        top={PAD_T}
        left={PAD_L}
        titleSize={TITLE_SIZE}
        subSize={Math.max(ROW_FONT, Math.round(TITLE_SIZE / 2))}
        accentColor={accentColor}
        fallbackTitle="Race Scrolling"
      />

      {/* Scrolling plane: everything inside translates by `scrollX` ("todo el
          plano scrollea"). The now-guide and the header stay fixed. */}
      <div style={{flex: 1, position: 'relative', marginTop: isPortrait ? H * 0.03 : 36, overflow: 'hidden'}}>
        {/* Now-guide line */}
        <div style={{position: 'absolute', left: anchorXPx, top: rowsTopY - 8, height: rowsHeight + 8 + (showXAxis ? BAND_H + 18 : 0), width: 2, borderRadius: 1, backgroundColor: accentColor, opacity: 0.45, zIndex: 1, boxShadow: `0 0 10px ${accentColor}66`}} />

        {/* World container — the parts of the plane that travel */}
        <div style={{position: 'absolute', left: PAD_L, top: rowsTopY, width: innerW, height: Math.max(rowsHeight, 1), transform: `translateX(${scrollX}px)`, zIndex: 2}}>
          {/* Rows */}
          {renderPool.map((p) => renderRow(p))}

          {/* Y axis rides the plane at the bars' origin (all-time zero) */}
          {showYAxis && (
            <div style={{position: 'absolute', left: 0, top: rowsTop, height: rowsHeight, width: yAxisWidth ?? 2, borderRadius: 1, backgroundColor: yAxisColor ?? '#334155'}} />
          )}

          {/* Axis band: ticks + markers ride the plane */}
          {showXAxis && BAND_H > 0 && (
            <div style={{position: 'absolute', left: 0, top: axisPosition === 'top' ? -BAND_H - 18 : rowsHeight + 18, width: BAR_MAX_W, height: BAND_H, borderTop: axisPosition === 'bottom' ? '1px solid #1f2937' : 'none', borderBottom: axisPosition === 'top' ? '1px solid #1f2937' : 'none', fontSize: AXIS_FONT, color: '#64748b', fontVariantNumeric: 'tabular-nums'}}>
              {ticks.map((tick, i) => (
                <div key={i} style={{position: 'absolute', top: 6, transform: 'translateX(-50%)', whiteSpace: 'nowrap'}}>
                  <span>{tick.label}</span>
                </div>
              ))}
              {renderPool.map((p) => (p.active ? markerFor(p) : null))}
            </div>
          )}
        </div>
      </div>

      {/* On-screen "now" label (fixed, bottom-right) */}
      {showDateLabel && (
        <div style={{position: 'absolute', right: PAD_R, bottom: PAD_B > 30 ? PAD_B : 30, transform: `translate(${dateX ?? 0}px, ${dateY ?? 0}px)`, ...textStyle(dateText, {color: accentColor, size: DATE_FONT, weight: 800}), fontVariantNumeric: 'tabular-nums', lineHeight: dateText?.lineHeight ?? 1}}>
          {nowLabel}
        </div>
      )}
    </div>
  );
};