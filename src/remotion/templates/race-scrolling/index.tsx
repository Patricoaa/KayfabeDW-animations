import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Img} from 'remotion';
import type {RaceTextStyle, ValueFormat} from '../../../lib/animation-config';
import {ICON_GLYPHS} from '../../../lib/chart-icons';
import {Header} from '../shared/Header';
import {BackgroundLayer} from '../shared/Background';
import {Avatar} from '../shared/Avatar';
import {fmtValue} from '../shared/fmt';
import {textStyle} from '../shared/text';

// A scrolling-axis ranked bar race. The ENTITY AXIS is STATIC: each entity
// rows is a fixed lane with its name (and avatar) pinned on the left, always
// visible. Its bar grows IN PLACE from that axis, with length proportional to
// the accumulated value up to the current moment (interpolated between data
// points), so the bar "eats" each date's value as the now-line passes it.
//
// The scrolling ribbon lives inside a PLOT BOX — a fixed clip viewport exactly
// covering the bar track ([BAR_TRACK_X, BAR_TRACK_X+BAR_MAX_W], bounded by the
// entity axis on the left). Inside it the plane scrolls horizontally like a
// moving tape, pinned to the PERMANENT Y AXIS at the plot's left edge: the date
// whose gridline is touching the axis at any moment is the "now", and the bars
// accumulate exactly as each grid passes it. The sweep starts HALF A PLOT
// before the first date, so every bar begins at 0 and the first date grid
// appears at the CENTER of the plot, sliding left until the last grid ends
// touching the axis:
//   - a positional band with ONE TICK + VERTICAL GRIDLINE per real date (or
//     numeric axis value) present in the data, thinned so consecutive gridlines
//     are at least `gridSpacing` px apart (the ones closer than that are
//     skipped, the rest slide in/out with the scroll);
//   - date-grid MARKERS: each kept grid ("caja eje") carries the number/icon/
//     image of every entity whose accumulated value CHANGES at that date (delta
//     ≠ 0), pinned ON the gridline at the lane height of its entity. A date
//     with delta 0 draws no marker.
// Everything on the tape (labels, gridlines, markers) is clipped at the plot
// box, so it visibly slides out and disappears as it crosses the plot's limits
// — exactly like a moving ribbon. The PERMANENT Y axis is a static vertical
// line right AFTER the avatar column (the origin of the bar track, padded by
// the row gap) that the bars grow from.
// `axisDirection` flips the sweep (Mayor→Menor only reverses the value→position
// mapping). The NUMBER marker shows the amount that date adds: delta = "valor
// acumulado en fecha − valor acumulado en la fecha anterior" (acumulated diff,
// not the running total); icon/image markers follow the same delta≠0 rule.
// Hidden when delta is 0.
// `barsX`/`barsY` (px) shift the whole anchored block — bars, avatars, row
// labels, the permanent Y axis and the scrolling grid/date labels — from its
// default placement.
//
// The layout is fully responsive: it reads the composition width/height via
// `useVideoConfig()` and re-flows for landscape, portrait (9:16), post (4:5),
// square, and custom sizes.
export type RaceScrollingItem = {
  label: string;              // entity / event name
  image?: string | null;      // optional avatar + marker image (url / data: / root-relative)
  pos: number;                // position on the scrolling axis (date ms or plain number)
  value: number;              // accumulated numeric shown once activated
  delta?: number;             // (informational) per-period amount that date adds; the number marker computes its own delta from `value`
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
  showDateLabel?: boolean;
  showXAxis?: boolean;
  // Axis sweep direction: 'asc' (Menor→Mayor) or 'desc' (Mayor→Menor). Only
  // the value→position mapping reverses; camera and ranking are unchanged.
  axisDirection?: 'asc' | 'desc';
  // Min horizontal distance (px, 20-320, default 90) between consecutive
  // positional gridlines/labels on the plane. Dates closer than this are
  // skipped; farther ones scroll in/out and stay distinguishable.
  gridSpacing?: number;
  // Show the entity name label on the fixed left axis (default true). When
  // false the name column collapses and the bar track / plot expands left.
  showLabels?: boolean;
  // 'running' (default): `value` is the accumulated total up to that pos;
  // 'period': `value` is the per-period amount. Only the grid markers consume
  // this (to derive the delta from `value`); the bars just interpolate `value`.
  accumulateMode?: 'running' | 'period';
  // Per-entity markers on the scrolling axis band: number / icon / image.
  showMarkers?: boolean;
  markerMode?: 'number' | 'icon' | 'image';
  markerIcon?: string;
  markerSize?: number;
  markerText?: RaceTextStyle;
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
  // Base the avatar background on its entity's bar color (overrides `avatarBg`).
  avatarBgFromBar?: boolean;
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
  yAxisColor?: string;
  yAxisWidth?: number;
  // Offset (px) of the whole anchored block from its default placement: bars +
  // avatars + row labels + the permanent Y axis + the scrolling grid/date
  // labels move together.
  barsX?: number;
  barsY?: number;
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
  showRail = false,
  showDateLabel = true,
  showXAxis = true,
  axisDirection = 'asc',
  gridSpacing,
  showLabels = true,
  accumulateMode,
  showMarkers = true,
  markerMode = 'number',
  markerIcon = 'star',
  markerSize,
  markerText,
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
  avatarBgFromBar,
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
  yAxisColor = '#334155',
  yAxisWidth = 2,
  barsX,
  barsY,
  titleText,
  dateText,
  labelText,
  valueText,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width: W, height: H} = useVideoConfig();

  // Row segments are FIXED: the avatar always comes first, then the bar. This
  // template has no per-row ordering control.
  const SEG_ORDER: ('avatar' | 'bar')[] = ['avatar', 'bar'];

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
                <div style={{flexShrink: 0}}>{showAvatar && item.image && <Avatar src={item.image} size={COMPAT_AVATAR} shape={avatarShape} radius={avatarRadius} bg={avatarBgFromBar ? barFill : avatarBg} borderColor={avatarBorderColor} borderWidth={avatarBorderWidth} />}</div>
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
  // 'desc' (Mayor→Menor) only flips the mapping value→position: the same value
  // sits further right as the race sweeps from max towards min. The sweep t
  // (0→1) and the camera keep their normal behavior.
  const desc = axisDirection === 'desc';
  const posToX = (v: number) => (desc ? 1 - (v - min) / span : (v - min) / span);
  const valueAtX = (fx: number) => (desc ? max - span * fx : min + span * fx);

  const innerW = W - PAD_L - PAD_R;
  const ROW_GAP_PX = rowGapH ?? innerW * 0.03;
  const BAR_RATIO = Math.min(Math.max(barWidth ?? 0.75, 0.1), 0.95);
  // Static entity axis: a fixed name column on the left of every row. Its
  // width fits the longest entity label (approx. char width for the label font).
  // When `showLabels` is off the column collapses (NAME_W = 0) and the plot /
  // bar track expands to the left.
  const LABEL_FONT = Math.max(12, Math.round(ROW_FONT * 0.8));
  const NAME_W = (showLabels ?? true)
    ? Math.min(innerW * 0.34, Math.max(110, Math.max(...items.map((r) => r.label.length), 1) * LABEL_FONT * 0.52 + 16))
    : 0;
  // Bars grow IN PLACE from this column, so only the track to its right scrolls.
  const BAR_MAX_W = Math.max((innerW - NAME_W - ROW_GAP_PX * 2) * BAR_RATIO, 1);
  // Explicit `avatarSize` wins (mirrors the timeline-race); otherwise the avatar
  // takes the leftover width after the name column and the bar track.
  const AVATAR_W = avatarSize ?? Math.max(innerW - NAME_W - BAR_MAX_W - ROW_GAP_PX * 2, 0);
  // The plot (gridlines, date labels and value Y axis) is aligned to
  // the ACTUAL bar track: rows lay out as [name][avatar][bar], so the bar
  // origin sits after the name column, the horizontal gap, the avatar column
  // (its size + a padding covers the avatar radius + breathing room) and the
  // gap again. Everything left-to-right derives from this.
  const BAR_TRACK_X = PAD_L + NAME_W + ROW_GAP_PX + AVATAR_W + ROW_GAP_PX;
  const EASE = 26;
  const OUTRO = Math.min(45, Math.max(0, Math.floor(durationInFrames * 0.12)));
  const sweepBudget = Math.max(0, durationInFrames - EASE * 2 - OUTRO);
  const holdCap = Math.max(0, sweepBudget - 1);
  const holdFinalFrames = Math.max(0, Math.min(Math.round(holdFinalSeconds * fps), holdCap));
  const sweepFrames = raceDurationSeconds != null
    ? Math.max(1, Math.min(Math.max(1, Math.round(raceDurationSeconds * fps)), sweepBudget))
    : Math.max(sweepBudget - holdFinalFrames, 1);
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
    const x = Math.min(Math.max(posToX(r.pos), 0), 1);
    let entry = byLabel.get(r.label);
    if (!entry) {
      entry = {image: r.image, steps: []};
      byLabel.set(r.label, entry);
    }
    entry.steps.push({x, value: r.value});
  }
  for (const e of byLabel.values()) e.steps.sort((a, b) => a.x - b.x);

  // Race-Scrolling keeps STATIC rows: the lane order is fixed ONCE (alphabetical
  // by label) and never re-sorted by the live value as the axis sweeps — unlike
  // a timeline-race, whose rows swap every sweep. Only the bars grow in place.
  const staticOrder = [...byLabel.keys()].sort((a, b) => a.localeCompare(b));

  // ---- Live ranking snapshots, shared per sweep position (see timeline-race) ----
  type Participant = {label: string; image?: string | null; active: boolean; firstX: number; current: number};
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
    for (const label of staticOrder) {
      const e = byLabel.get(label)!;
      const steps = e.steps;
      let i = -1;
      for (let k = 0; k < steps.length; k++) {
        if (t >= steps[k].x) i = k;
        else break;
      }
      const active = i >= 0;
      let current = 0;
      if (active) {
        const cur = steps[i];
        const nxt = steps[i + 1];
        current = cur.value;
        if (nxt) {
          const segSpan = Math.max(nxt.x - cur.x, 1e-4);
          const frac = Math.min(1, Math.max(0, (t - cur.x) / segSpan));
          current = cur.value + (nxt.value - cur.value) * frac;
        }
      }
      list.push({label, image: e.image, active, firstX: steps[0]?.x ?? 1, current});
    }
    const full = list; // fixed alphabetical order — lanes are assigned once and never swap
    const all = maxRows && maxRows > 0 ? full.slice(0, maxRows) : full;
    const visActive = all.filter((p) => p.active);
    const visInactive = all.filter((p) => !p.active);
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

  // Fixed GLOBAL bar scale computed once from the whole dataset: the maximum
  // accumulated value reached by any entity at any date. The bars grow toward
  // this stable maximum from the start — never recalibrated mid-race.
  const maxAccum = Math.max(...[...byLabel.values()].flatMap((e) => e.steps.map((s) => s.value)), 0) || 1;

  // Vertical plot geometry derives from the rows block (its height sums every
  // row gap from the "Separación vertical entre filas" control) plus a padding
  // that scales with that same control. A band above the plot hosts the date
  // labels; rows start right below it.
  const DATE_LABEL_H = 26;
  const DATE_BAND_H = DATE_LABEL_H + 10;
  const ROW_GAP = rowGap ?? (isPortrait ? 14 : 8);
  const PLOT_PAD_Y = Math.max(8, Math.round(ROW_GAP / 2));
  const rowBudget = H - PAD_T - PAD_B - TITLE_SIZE * 1.4 - (isPortrait ? H * 0.12 : 100) - (isPortrait ? 12 : 36) - (DATE_BAND_H + PLOT_PAD_Y);
  const ROW_H = rowCount <= 6 ? Math.min(rowBudget / rowCount * 0.72, isPortrait ? 150 : 96) : Math.max(52, rowBudget / rowCount * 0.62);
  const rowsHeight = rowCount * ROW_H + (rowCount - 1) * ROW_GAP;

  const GROOVE_H = barThickness != null ? Math.min(Math.max(4, Math.round(barThickness)), Math.max(12, ROW_H * 0.7)) : Math.max(12, ROW_H * 0.42);
  const BAR_H = GROOVE_H + Math.max(2, Math.round(ROW_H * 0.06));

  // ---- Scrolling plane geometry ----
  // Fixed "now" line: pinned to the PERMANENT Y AXIS (the left edge of the bar
  // track, x=0 de cada barra). The sweep starts HALF A PLOT BEFORE the first
  // date, so every bar begins at 0 and each date's amount accumulates into the
  // bars exactly when its gridline crosses the Y axis. The first grid appears
  // at the CENTER of the plot; the last one ends TOUCHING the axis.
  const anchorWorld = 0;
  const nowWorld = (guideT * 1.5 - 0.5) * BAR_MAX_W;
  const scrollX = anchorWorld - nowWorld; // = -nowWorld
  const nowFrac = Math.max(0, Math.min(1, guideT * 1.5 - 0.5)); // clamp del "now" al primer dato
  const nowWorldValue = valueAtX(nowFrac);
  const nowLabel = axisUnit === 'date' ? fmtDate(nowWorldValue, dateFormat) : fmtValue(Math.round(nowWorldValue), valueFormat, currencySymbol);

  // ---- Winner reveal + outro ----
  const raceFinished = guideT >= 0.99;
  const finishStart = Math.max(0, raceEndFrame - 12);
  const winnerT = raceFinished
    ? interpolate(frame, [finishStart, finishStart + 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;
  const winnerScale = podiumEffect ? 1 + 0.05 * winnerT : 1;
  const dimOthers = podiumEffect ? 1 - 0.35 * winnerT : 1;

  const avatarCropFor = (label: string, image?: string | null): {zoom: number; focusX: number; focusY: number} => {
    const c = avatarCrops?.[label] ?? (image ? avatarCrops?.[image] : undefined);
    return {zoom: c?.zoom ?? 1, focusX: c?.focusX ?? 0, focusY: c?.focusY ?? 0};
  };

  const entityOrder = staticOrder;
  const palColor = (label: string): string | undefined => {
    if (!barPalette || barPalette.length === 0) return undefined;
    return barPalette[Math.max(0, entityOrder.indexOf(label)) % barPalette.length];
  };

  function laneY(index: number) {
    return index * (ROW_H + ROW_GAP);
  }

  const leaderOf = visibleActive.reduce<Participant | null>((m, p) => (m === null || p.current > m.current ? p : m), null);
  const isLeader = (p: Participant) => leaderOf !== null && p.current === leaderOf.current && p.current > 0;

  // ---- Grid bands + markers: the part that scrolls (the "plane") ----
  const MARKER_SIZE = markerSize ?? (isPortrait ? Math.round(W * 0.055) : 26);
  const AXIS_FONT = isPortrait ? Math.round(W * 0.026) : 13;

  // Date labels live in a reserved strip DIRECTLY ABOVE each date gridline and
  // scroll with it. The value scale is the PERMANENT static Y axis, a vertical
  // line right after the avatar column at the origin of the bar track (see
  // below), so there are no extra traveling bands.
  const rowsTopY = DATE_BAND_H + PLOT_PAD_Y;
  const plotTop = rowsTopY - PLOT_PAD_Y;
  const bottomEnd = rowsHeight + PLOT_PAD_Y * 2;

  const tickLabels = (t: number) => (axisUnit === 'date' ? fmtDate(t, dateFormat) : fmtValue(t, valueFormat, currencySymbol));
  // Positional band: ONE tick/gridline per distinct real position (date bucket /
  // numeric axis value), at its exact spot, thinned by `gridSpacing` (px) so
  // consecutive gridlines are distinguishable — dates closer than the minimum
  // are skipped, the rest slide in/out with the scroll like a tape.
  const ticks = (() => {
    const seen = new Set<number>();
    for (const r of items) if (Number.isFinite(r.pos)) seen.add(r.pos);
    const spacing = Math.max(gridSpacing ?? 90, 20);
    const out: {label: string; x: number; pos: number}[] = [];
    let lastX = Number.NEGATIVE_INFINITY;
    for (const p of [...seen].sort((a, b) => a - b)) {
      const x = posToX(p) * BAR_MAX_W;
      if (Math.abs(x - lastX) < spacing) continue;
      out.push({label: tickLabels(p), x, pos: p});
      lastX = x;
    }
    return out;
  })();

  // Overlap guard for the DATE labels: even after the `gridSpacing` thinning, a
  // label whose estimated width would collide with the previously kept label is
  // dropped so they never bunch up on top of each other.
  const dateLabels = (() => {
    const out: {label: string; x: number}[] = [];
    let lastRight = Number.NEGATIVE_INFINITY;
    for (const t of ticks) {
      const w = t.label.length * 7 + 12;
      if (t.x - lastRight < 4) continue;
      out.push(t);
      lastRight = t.x + w;
    }
    return out;
  })();

  // Permanent Y axis: a single vertical line right AFTER the avatar column,
  // at the origin of the bar track (BAR_TRACK_X, the "minimum padding" from
  // the avatar is the horizontal row gap). The scale is implied 0 → current
  // max, so it stands as the value-axis origin the bars grow from.

  // Markers are pinned to the DATE GRIDS (the "caja eje"): each kept tick
  // carries the markers of every entity that CHANGES its accumulated value at
  // that date, drawn ON the gridline at their lane's height, in world
  // coordinates so they scroll in/out with the tape. The NUMBER marker shows
  // the amount that date adds: delta = "valor acumulado en fecha − valor
  // acumulado en la fecha anterior" (in 'period' mode `value` already IS the
  // period amount, so delta = value). A date whose delta is 0 draws no marker;
  // grids dropped by `gridSpacing` draw none either.
  const markersByPos = (() => {
    const map = new Map<number, {label: string; image?: string | null; delta: number}[]>();
    const prevValue = new Map<string, {value: number; started: boolean}>();
    const isRunning = (accumulateMode ?? 'running') === 'running';
    for (const r of rows) {
      if (!Number.isFinite(r.pos)) continue;
      const prev = prevValue.get(r.label) ?? {value: 0, started: false};
      const delta = isRunning ? (prev.started ? r.value - prev.value : r.value) : r.value;
      prevValue.set(r.label, {value: r.value, started: true});
      if (delta === 0) continue;
      let list = map.get(r.pos);
      if (!list) {
        list = [];
        map.set(r.pos, list);
      }
      list.push({label: r.label, image: r.image, delta});
    }
    return map;
  })();

  const markerGlyph = ICON_GLYPHS[markerIcon ?? 'star'] ?? ICON_GLYPHS.star;
  const markerColorOf = (label: string, image?: string | null): string =>
    barColors?.[label] ?? (image ? barColors?.[image] : undefined) ?? palColor(label) ?? '#3f3f46';

  // One marker per entity at the grid of its date, centered on its lane.
  const markerOnGrid = (tick: {x: number}, ent: {label: string; image?: string | null; delta: number}) => {
    if (!currentRank.window.has(ent.label)) return null;
    const laneTop = PLOT_PAD_Y + laneY(rankNow(ent.label)) + ROW_H / 2;
    if (markerMode === 'image' && ent.image) {
      return (
        <div key={ent.label} style={{position: 'absolute', left: tick.x - MARKER_SIZE / 2, top: laneTop - MARKER_SIZE / 2, width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: Math.max(2, MARKER_SIZE * 0.18), overflow: 'hidden', border: '1px solid rgba(255,255,255,0.28)'}}>
          <Img src={ent.image} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
      );
    }
    if (markerMode === 'icon') {
      return (
        <div key={ent.label} style={{position: 'absolute', left: tick.x - MARKER_SIZE / 2, top: laneTop - MARKER_SIZE / 2, width: MARKER_SIZE, height: MARKER_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: markerColorOf(ent.label, ent.image), filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'}}>
          <svg viewBox="0 0 24 24" width={MARKER_SIZE} height={MARKER_SIZE}><path d={markerGlyph} fill="currentColor" /></svg>
        </div>
      );
    }
    return (
      <div key={ent.label} style={{position: 'absolute', left: tick.x, top: laneTop - (AXIS_FONT + 2) / 2, transform: 'translateX(-50%)', ...textStyle(markerText, {color: '#ffffff', size: AXIS_FONT + 2, weight: 700}), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
        {fmtValue(Math.round(ent.delta), valueFormat, currencySymbol)}
      </div>
    );
  };

  const barFillOf = (p: Participant): string =>
    barColors?.[p.label] ?? (p.image ? barColors?.[p.image] : undefined) ?? palColor(p.label) ?? (isLeader(p) ? accentColor : '#3f3f46');

  const renderRow = (p: Participant) => {
    const display = p.current;
    const rawW = Math.max(0, (display / maxAccum) * BAR_MAX_W);
    const pop = p.active
      ? spring({
          fps,
          frame: frame - Math.max(0, Math.floor((p.firstX / 1.001) * sweepFrames)),
          config: {damping: 22, stiffness: 110},
          durationInFrames: 28,
        })
      : 1;
    const w = rawW * pop;
    const scale = isLeader(p) ? winnerScale : 1;
    const dim = isLeader(p) ? 1 : dimOthers;

    const yNow = laneY(rankNow(p.label));
    const change = evalChange(p.label);
    let top = yNow;
    let rowOpacity = dim;
    if (change) {
      const sw = Math.min((frame - change.atFrame) / (SWAP - 1), 1);
      top = laneY(change.fromRank) + (yNow - laneY(change.fromRank)) * Easing.out(Easing.cubic)(Math.max(sw, 0));
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
        top = laneY(belowLane) + (laneY(bnd.nowRank) - laneY(belowLane)) * ease;
        rowOpacity = dim * ease;
      } else {
        top = laneY(bnd.fromRank) + (laneY(belowLane) - laneY(bnd.fromRank)) * ease;
        rowOpacity = dim * (1 - ease);
      }
    }

    const barFill = barFillOf(p);

    const segments: Record<'bar' | 'avatar', React.ReactNode> = {
      bar: (
        <div style={{flexShrink: 0, width: BAR_MAX_W, height: BAR_H, position: 'relative', display: 'flex', alignItems: 'center'}}>
          {showRail !== false && <div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: GROOVE_H, transform: 'translateY(-50%)', backgroundColor: '#171717', borderRadius: barRadius ?? 999, opacity: pop}} />}
          <div style={{position: 'absolute', left: 0, top: '50%', width: Math.max(0, w), height: BAR_H, transform: `translateY(-50%) scaleY(${scale})`, backgroundColor: barFill, borderRadius: barRadius ?? 999, boxShadow: isLeader(p) && podiumEffect ? `0 0 ${18 * scale}px ${accentColor}99` : 'none'}} />
          <div style={{position: 'absolute', right: BAR_MAX_W - Math.max(0, w) + 12, top: 0, bottom: 0, maxWidth: Math.max(0, w - 24), minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden', pointerEvents: 'none', opacity: pop}}>
            <span style={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.45)', ...textStyle(valueText, {color: '#ffffff', size: ROW_FONT, weight: 800})}}>
{fmtValue(Math.round(p.current), valueFormat, currencySymbol)}
            </span>
          </div>
        </div>
      ),
      avatar: (
        <div style={{width: AVATAR_W, flexShrink: 0, textAlign: 'right'}}>
          {showAvatar && p.image && <Avatar src={p.image} size={AVATAR_W} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(p.label, p.image)} bg={avatarBgFromBar ? barFill : avatarBg} borderColor={avatarBorderColor} borderWidth={avatarBorderWidth} />}
        </div>
      ),
    };

    return (
      <div key={p.label} style={{position: 'absolute', left: 0, right: 0, height: ROW_H, top, display: 'flex', alignItems: 'center', gap: ROW_GAP_PX, opacity: rowOpacity}}>
        {(showLabels ?? true) && (
          <div style={{width: NAME_W, flexShrink: 0, overflow: 'hidden', textAlign: 'right', paddingRight: ROW_GAP_PX * 0.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>
            <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', ...textStyle(labelText, {color: '#e4e4e7', size: LABEL_FONT, weight: 700}), opacity: pop}}>{p.label}</span>
          </div>
        )}
        {SEG_ORDER.map((seg) => segments[seg])}
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

      {/* Static rows: the ENTITY AXIS is fixed. Only the grid bands (positional
          + optional cardinality) scroll; the header area stays fixed.
          `barsX`/`barsY` translate the WHOLE anchored block (rows + avatars +
          labels, scroll plane with its gridlines/markers/date labels and the
          permanent Y axis) in px. */}
      <div style={{flex: 1, position: 'relative', marginTop: isPortrait ? H * 0.03 : 36, overflow: 'hidden', transform: `translate(${barsX ?? 0}px, ${barsY ?? 0}px)`}}>
        {/* Rows container — static, aligned to the left of the plane */}
        <div style={{position: 'absolute', left: PAD_L, top: rowsTopY, width: innerW, height: Math.max(rowsHeight, 1), zIndex: 2}}>
          {renderPool.map((p) => renderRow(p))}
        </div>

        {/* Grid markers — pinned to the DATE GRIDS ("caja eje"): each kept tick
            shows the icon/image/number of every entity with a non-zero value at
            that date, at its lane's height, scrolling with the tape inside the
            plot box. Dates whose value is 0 draw nothing. */}
        {showXAxis && showMarkers && (
          <div style={{position: 'absolute', left: BAR_TRACK_X, top: plotTop, width: BAR_MAX_W, height: bottomEnd, overflow: 'hidden', zIndex: 3, pointerEvents: 'none'}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: BAR_MAX_W, height: bottomEnd, transform: `translateX(${scrollX}px)`}}>
              {ticks.map((tick) => {
                const ents = markersByPos.get(tick.pos);
                if (!ents || ents.length === 0) return null;
                return ents.map((ent) => markerOnGrid(tick, ent));
              })}
            </div>
          </div>
        )}

{/* Permanent Y axis: the static line right after the avatar column, at the
            STATIONARY origin of the bar track (no numeric ticks; the scale is
            implied 0 → global accumulated max). It spans EXACTLY the rows block
            (from the top of the first row to the bottom of the last), starting
            right where the bars begin — the accumulation boundary the date
            grids slide into. */}
        <div style={{position: 'absolute', left: BAR_TRACK_X, top: rowsTopY, height: rowsHeight, zIndex: 3}}>
          <div style={{position: 'absolute', left: -(yAxisWidth ?? 2) / 2, top: 0, bottom: 0, width: yAxisWidth ?? 2, borderRadius: 1, backgroundColor: yAxisColor ?? '#334155'}} />
        </div>

        {/* Date labels: one DIRECTLY ABOVE each date gridline, in a strip that
            scrolls with the tape. Labels that would overlap the previous one
            are skipped (see `dateLabels`), so they never bunch together. */}
        {showXAxis && (
          <div style={{position: 'absolute', left: BAR_TRACK_X, top: rowsTopY - DATE_BAND_H, width: BAR_MAX_W + 160, height: DATE_BAND_H, transform: `translateX(${scrollX}px)`, overflow: 'hidden', zIndex: 3}}>
            {dateLabels.map((tick, i) => (
              <span key={i} style={{position: 'absolute', top: 4, left: tick.x, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: AXIS_FONT, color: '#e2e8f0', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)', fontVariantNumeric: 'tabular-nums'}}>{tick.label}</span>
            ))}
          </div>
        )}

        {/* Plot box — fixed clip viewport over the bar track. The scrolling
            tape (date gridlines) lives INSIDE it, so dates slide out and
            disappear when they cross the plot limits ("cinta que se desplaza"). */}
        <div style={{position: 'absolute', left: BAR_TRACK_X, top: plotTop, width: BAR_MAX_W, height: bottomEnd, overflow: 'hidden', zIndex: 1}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: BAR_MAX_W, height: bottomEnd, transform: `translateX(${scrollX}px)`}}>
            {/* Vertical gridlines: one per real date/value, aligned to the rows area */}
            {showXAxis && (
              <div style={{position: 'absolute', left: 0, top: PLOT_PAD_Y, width: BAR_MAX_W, height: rowsHeight}}>
                {ticks.map((tick, i) => (
                  <div key={i} style={{position: 'absolute', left: tick.x, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(51, 65, 85, 0.35)'}} />
                ))}
              </div>
            )}
          </div>
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