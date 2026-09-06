import React from 'react';
import {useCurrentFrame, useVideoConfig, Easing, Img} from 'remotion';
import type {RaceTextStyle, ValueFormat, RowEntryElement} from '../../../lib/animation-config';
import {Header} from '../shared/Header';
import {BackgroundLayer} from '../shared/Background';
import {Avatar} from '../shared/Avatar';
import {textStyle} from '../shared/text';
import {fmtValue} from '../shared/fmt';

export type RankingItem = {
  label: string;
  image?: string | null;
  value: number;
};

// A ranked countdown: each entity drops in one by one, ordered best → worst
// (rank 1 pinned on top). `revealDirection` controls the drop-in order:
// 'desc' (default) reveals from last place up to #1 (countdown reveal), 'asc'
// reveals #1 first and closes with the tail of the ranking. When `countUp` is
// on (default), each datum counts up from 0 to its real value as its row
// drops in; the optional avatar renders via the shared Avatar (per-entity
// crops supported). `rankMode` switches between animated bars and a minimal
// table (horizontal separators only, thickness/color configurable); `showAvatar`
// hides all avatars. Each row's entry is configurable: each element
// (rank/avatar/bar/label/datum) travels a straight path from a cardinal side —
// all together following the general direction, or per element with its own
// direction and sequential delay. With `rowImages` set, a global frame
// takes the right side of the canvas, the rows squeeze to the left, and the
// frame shows the image of the position being revealed — a hard cut (no fade)
// followed by a one-way pan whose direction is per position. A minimum zoom
// keeps focus/pan functional at any zoom level. The frame width has no cap, so
// it can span the full canvas. Fully responsive: reads
// `useVideoConfig()` and re-flows for portrait (9:16), post (4:5), square and
// landscape while keeping the rows proportional.
export type RankingProps = {
  title?: string;
  items: RankingItem[];
  accentColor?: string;
  maxRows?: number;
  revealDirection?: 'asc' | 'desc';
  countUp?: boolean;
  countUpDurationSeconds?: number;
  holdFinalSeconds?: number;
  showRank?: boolean;
  showValue?: boolean;
  rankMode?: 'bars' | 'table';
  showAvatar?: boolean;
  rankPrefix?: string;
  avatarCrops?: Record<string, {zoom?: number; focusX?: number; focusY?: number}>;
  avatarSize?: number;
  avatarShape?: 'circle' | 'rounded';
  avatarRadius?: number;
  rowColors?: Record<string, string>;
  rowImages?: Record<string, string>;
  rowImageCrops?: Record<string, {zoom?: number; focusX?: number; focusY?: number}>;
  rowImageModes?: Record<string, 'entity' | 'url' | 'file'>;
  rowImageLabel?: boolean;
  rowImageLabelX?: number;
  rowImageLabelY?: number;
  rowImageLabelText?: RaceTextStyle;
  rowImageWidth?: number;
  rowImageHeight?: number;
  rowImageX?: number;
  rowImageY?: number;
  rowImagePan?: boolean;
  rowImagePanDirs?: Record<string, 'ltr' | 'rtl'>;
  rowImageFrameBg?: 'canvas' | 'dark';
  rowEntryDir?: 'left' | 'right' | 'top' | 'bottom';
  rowEntryMode?: 'together' | 'custom';
  rowEntryDirs?: Partial<Record<RowEntryElement, 'left' | 'right' | 'top' | 'bottom'>>;
  rowEntryDelays?: Partial<Record<RowEntryElement, number>>;
  tableSepWidth?: number;
  tableSepColor?: string;
  rowGap?: number;
  rowGapH?: number;
  valueFormat?: ValueFormat;
  currencySymbol?: string;
  barWidth?: number;
  showRail?: boolean;
  rowsX?: number;
  rowsY?: number;
  rankText?: RaceTextStyle;
  valueText?: RaceTextStyle;
  labelText?: RaceTextStyle;
  titleX?: number;
  titleY?: number;
  titleText?: RaceTextStyle;
  subtitle?: string;
  subtitleText?: RaceTextStyle;
  subtitleX?: number;
  subtitleY?: number;
  backgroundType?: 'color' | 'pattern' | 'gradient' | 'image';
  background?: string;
  backgroundSecondary?: string;
  backgroundImage?: string;
  backgroundPattern?: 'dots' | 'stripes' | 'grid' | 'checkers';
  backgroundAngle?: number;
  backgroundOpacity?: number;
  backgroundBlur?: number;
  backgroundFit?: 'cover' | 'contain' | 'fill';
};

export const Ranking: React.FC<RankingProps> = ({
  title,
  items = [],
  accentColor = '#FFD700',
  maxRows,
  revealDirection = 'desc',
  countUp = true,
  countUpDurationSeconds,
  holdFinalSeconds = 2,
  showRank = true,
  showValue = true,
  rankMode = 'bars',
  showAvatar = true,
  rankPrefix = '#',
  avatarCrops,
  avatarSize,
  avatarShape = 'circle',
  avatarRadius,
  rowColors,
  rowImages,
  rowImageCrops,
  rowImageModes,
  rowImageLabel,
  rowImageLabelX = 12,
  rowImageLabelY = 12,
  rowImageLabelText,
  rowImageWidth,
  rowImageHeight,
  rowImageX,
  rowImageY,
  rowImagePan = true,
  rowImagePanDirs,
  rowImageFrameBg = 'canvas',
  rowEntryDir = 'bottom',
  rowEntryMode = 'together',
  rowEntryDirs,
  rowEntryDelays,
  tableSepWidth = 1,
  tableSepColor = 'rgba(255,255,255,0.14)',
  rowGap,
  rowGapH,
  valueFormat = 'number',
  currencySymbol = '$',
  barWidth,
  showRail = true,
  rowsX,
  rowsY,
  rankText,
  valueText,
  labelText,
  titleX,
  titleY,
  titleText,
  subtitle,
  subtitleText,
  subtitleX,
  subtitleY,
  backgroundType = 'color',
  background = '#0a0a0a',
  backgroundSecondary = '#1f2937',
  backgroundImage,
  backgroundPattern = 'dots',
  backgroundAngle = 135,
  backgroundOpacity = 1,
  backgroundBlur = 0,
  backgroundFit = 'cover',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width: W, height: H} = useVideoConfig();
const rows = items.filter((it) => !isNaN(it.value) && it.label !== '');
  if (rows.length === 0) {
    return <div style={{width: '100%', height: '100%', backgroundColor: background || '#0a0a0a'}} />;
  }

  // Final ranking: best value on top, rank 1 = index 0. maxRows keeps only the
  // top-N by value (items usually arrive from resolveRanking already trimmed;
  // this guard keeps external callers that feed the full set consistent).
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const ranked = maxRows && maxRows > 0 ? sorted.slice(0, maxRows) : sorted;
  const n = ranked.length;
  const maxValue = Math.max(...ranked.map((r) => r.value), 0) || 1;

  // ---- Responsive geometry ----
  const isPortrait = H > W;
  const PAD = isPortrait ? Math.round(W * 0.05) : 56;
  const PAD_T = PAD;
  const PAD_L = PAD;
  const PAD_R = PAD;
  const PAD_B = isPortrait ? PAD + 40 : 84;
  const TITLE_SIZE = isPortrait ? Math.round(W * 0.075) : 42;
  const ROW_FONT = isPortrait ? Math.round(W * 0.045) : 21;
  const RANK_W = isPortrait ? Math.round(W * 0.11) : 72;
  const AVATAR = avatarSize ?? (isPortrait ? Math.round(W * 0.09) : 48);
  const avatarVisible = showAvatar !== false && AVATAR > 0;
  const GAP = isPortrait ? 12 : 16;
  // Horizontal gap between row segments (rank/avatar/bar/datum). 0 is honored
  // literally — users can collapse the segments without retriggering the auto
  // default.
  const GAP_H = rowGapH ?? GAP;
  // Vertical spacing between rows (independent of the horizontal gap). When
  // `rowGap` is provided its value is stored literally — 0 means 0 (no gap).
  const ROW_GAP = rowGap ?? (isPortrait ? 14 : 8);

  const innerW = W - PAD_L - PAD_R;

  // Effective per-position image source: 'entity' mode uses the entity's image
  // field (the avatar source), falling back to the manual rowImages entry;
  // 'url'/'file' (and the default) use the manual entry directly.
  const rowImageFor = (label: string, image?: string | null) =>
    rowImageModes?.[label] === 'entity' ? image ?? rowImages?.[label] ?? null : rowImages?.[label] ?? null;

  // Split layout when per-position images are configured: a global frame takes
  // the right side of the canvas and the ranking rows squeeze to the left.
  const HAS_FRAME =
    (rowImages != null && Object.keys(rowImages).length > 0) ||
    ranked.some((r) => rowImageModes?.[r.label] === 'entity' && !!rowImageFor(r.label, r.image));
  const FRAME_W0 = rowImageWidth ?? Math.round(innerW * 0.36);
  const FRAME_W = HAS_FRAME ? Math.max(Math.round(FRAME_W0), 16) : 0;
  const FRAME_GAP = HAS_FRAME ? GAP_H : 0;
  const rowsInnerW = HAS_FRAME ? Math.max(innerW - FRAME_W - FRAME_GAP, 80) : innerW;
  const rowsMarginTop = isPortrait ? Math.round(H * 0.03) : 36;
  const frameHDefault = Math.max(80, Math.round(H - PAD_B - (PAD_T + TITLE_SIZE * 1.4 + rowsMarginTop)));
  const frameHeight = rowImageHeight ?? frameHDefault;
  const frameLeftPx = HAS_FRAME ? Math.round(PAD_L + rowsInnerW + FRAME_GAP + (rowImageX ?? 0)) : 0;
  const frameTopPx = HAS_FRAME ? Math.round(PAD_T + rowsMarginTop + (rowImageY ?? 0)) : 0;

  const rowBudget = H - PAD_T - PAD_B - TITLE_SIZE * 1.4 - (isPortrait ? H * 0.12 : 100);
  const ROW_H = n <= 6 ? Math.min((rowBudget / n) * 0.7, isPortrait ? 130 : 84) : Math.max(46, (rowBudget / n) * 0.6);
  const rowsTop = Math.max(0, (rowBudget - n * ROW_H - (n - 1) * ROW_GAP) / 2);
  const rowLaneH = ROW_H + ROW_GAP;

  const BAR_FACTOR = Math.min(Math.max(barWidth ?? 1, 0.4), 1.5);
  const GROOVE_H = Math.max(10, ROW_H * 0.42);
  const BAR_H = GROOVE_H + Math.max(2, Math.round(ROW_H * 0.06));

  // ---- Timing: ease-in, per-row reveal sweep, hold on the final ranking ----
  const EASE = 8;
  const holdFrames = Math.max(0, Math.min(Math.round(holdFinalSeconds * fps), Math.max(0, durationInFrames - EASE - 1)));
  const sweepBudget = Math.max(1, durationInFrames - EASE - holdFrames);
  const sweepFrames =
    countUpDurationSeconds != null && countUpDurationSeconds > 0
      ? Math.max(1, Math.min(Math.round(countUpDurationSeconds * fps), sweepBudget))
      : sweepBudget;

  // Drop-in order by direction: 'desc' reveals the tail first and saves #1 for
  // last; 'asc' opens with the leader.
  const sequencePos = (i: number) => (revealDirection === 'asc' ? i : n - 1 - i);
  const step = sweepFrames / n;

  const avatarCropFor = (label: string, image?: string | null) => {
    const c = avatarCrops?.[label] ?? (image ? avatarCrops?.[image] : undefined);
    return {zoom: c?.zoom ?? 1, focusX: c?.focusX ?? 0, focusY: c?.focusY ?? 0};
  };

  // Row entry: the row container stays fixed in its lane; only the elements
  // (rank/avatar/bar/label/datum) translate along a pure axis. Horizontal
  // (`left`/`right`) sweeps span the full list width; vertical (`top`/`bottom`)
  // sweeps span the full list height, so each element emerges from the rows
  // area's own edge and travels perpendicularly into its slot — no diagonal
  // component at any frame. Opacity ramps linearly 0→1 across the whole travel,
  // so the element materializes while it moves and lands at full opacity the
  // instant it settles (no "appear in place, then drift" ghosting).
  // In 'together' mode every element shares the general direction; in 'custom'
  // each element can override its direction (`rowEntryDirs`) and add its own
  // sequential delay in frames (`rowEntryDelays`).
  const entryTransform = (element: RowEntryElement, prog: number) => {
    const custom = rowEntryMode === 'custom';
    const dir = custom
      ? (rowEntryDirs?.[element] ?? rowEntryDir ?? 'bottom')
      : (rowEntryDir ?? 'bottom');
    const delayFrac = custom ? Math.max(0, Math.min((rowEntryDelays?.[element] ?? 0) / Math.max(step, 1), 1)) : 0;
    const p = delayFrac > 0 && delayFrac < 1 ? (prog - delayFrac) / (1 - delayFrac) : prog;
    const e = Math.max(0, Math.min(p, 1));
    const sweep = dir === 'left' || dir === 'right' ? rowsInnerW : rowLaneH * n;
    const off = (1 - e) * sweep;
    const tx = dir === 'left' ? -off : dir === 'right' ? off : 0;
    const ty = dir === 'bottom' ? off : dir === 'top' ? -off : 0;
    return {transform: `translate(${tx}px, ${ty}px)`, opacity: e};
  };

  const renderRow = (item: RankingItem, index: number) => {
    const start = EASE + sequencePos(index) * step;
    const prog = Math.max(0, Math.min((frame - start) / Math.max(step, 1), 1));
    const easeOut = Easing.out(Easing.cubic)(prog);
    const shown = prog >= 1;
    const isLeader = index === 0;

    // Bar width as a % of its own flex track: rank/avatar/value and their gaps
    // are consumed by the flex layout, so the bar always fills the exact space
    // that remains (rank included when visible).
    const barW = (item.value / maxValue) * BAR_FACTOR * 100;
    const fill = rowColors?.[item.label] ?? (isLeader ? accentColor : '#475569');

    // Count-up datum (or static value when `countUp` is off).
    const displayValue = countUp ? Math.round(item.value * easeOut) : item.value;

    const rowFinalY = rowsTop + index * rowLaneH;
    // The row stays in its lane; the entry motion happens on the elements
    // (straight cardinal path via `entryTransform`), so no vertical drop here.
    const top = rowFinalY;

    const laneLabel = `${rankPrefix}${index + 1}`;
    const hasAvatar = !!item.image;

    return (
      <div
        key={`${item.label}-${index}`}
        style={{
          position: 'absolute',
          left: 0,
          top,
          width: rowsInnerW,
          height: ROW_H,
          display: 'flex',
          alignItems: 'center',
          gap: GAP_H,
        }}
      >
        {showRank && (
          <div style={{width: RANK_W, flexShrink: 0, textAlign: 'left', ...entryTransform('rank', prog)}}>
            <span style={{fontVariantNumeric: 'tabular-nums', ...textStyle(rankText, {color: isLeader ? accentColor : '#94a3b8', size: Math.round(ROW_FONT * (isLeader ? 1.25 : 1.05)), weight: 900})}}>
              {laneLabel}
            </span>
          </div>
        )}
        {avatarVisible && hasAvatar && (
          <div style={{flexShrink: 0, ...entryTransform('avatar', prog)}}>
            <Avatar src={item.image!} size={AVATAR} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(item.label, item.image)} />
          </div>
        )}
        <div style={{flex: 1, minWidth: 0, height: BAR_H, position: 'relative', display: 'flex', alignItems: 'center', ...entryTransform('bar', prog)}}>
          {showRail !== false && (
            <div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: GROOVE_H, transform: 'translateY(-50%)', backgroundColor: '#171717', borderRadius: 999}} />
          )}
          <div style={{position: 'absolute', left: 0, top: '50%', width: `${Math.max(0, barW)}%`, height: BAR_H, transform: 'translateY(-50%)', backgroundColor: fill, borderRadius: 999, boxShadow: isLeader && shown ? `0 0 ${18}px ${accentColor}99` : 'none'}} />
        </div>
        {showValue && (
          <div style={{flexShrink: 0, maxWidth: '28%', overflow: 'hidden', ...entryTransform('value', prog), ...textStyle(valueText, {color: isLeader ? accentColor : '#ffffff', size: ROW_FONT, weight: 800})}}>
            <span style={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', display: 'block', textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden'}}>
              {fmtValue(displayValue, valueFormat, currencySymbol)}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Table mode: minimalist rows, only horizontal separators. Same timing
  // (count-up, drop-in, leader highlight), no bars/rail.
  const renderRowTable = (item: RankingItem, index: number) => {
    const start = EASE + sequencePos(index) * step;
    const prog = Math.max(0, Math.min((frame - start) / Math.max(step, 1), 1));
    const easeOut = Easing.out(Easing.cubic)(prog);
    const isLeader = index === 0;

    const displayValue = countUp ? Math.round(item.value * easeOut) : item.value;

    const rowFinalY = rowsTop + index * rowLaneH;
    // The row stays in its lane; the entry motion happens on the elements
    // (straight cardinal path via `entryTransform`), so no vertical drop here.
    const top = rowFinalY;

    const hasAvatar = !!item.image;
    const laneLabel = `${rankPrefix}${index + 1}`;

    return (
      <div
        key={`${item.label}-${index}`}
        style={{
          position: 'absolute',
          left: 0,
          top,
          width: rowsInnerW,
          height: ROW_H,
          display: 'flex',
          alignItems: 'center',
          gap: GAP_H,
          borderBottom: `${tableSepWidth}px solid ${tableSepColor}`,
        }}
      >
        {showRank && (
          <div style={{width: RANK_W, flexShrink: 0, textAlign: 'left', ...entryTransform('rank', prog)}}>
            <span style={{fontVariantNumeric: 'tabular-nums', ...textStyle(rankText, {color: isLeader ? accentColor : '#94a3b8', size: Math.round(ROW_FONT * (isLeader ? 1.25 : 1.05)), weight: 900})}}>
              {laneLabel}
            </span>
          </div>
        )}
        {avatarVisible && hasAvatar && (
          <div style={{flexShrink: 0, ...entryTransform('avatar', prog)}}>
            <Avatar src={item.image!} size={AVATAR} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(item.label, item.image)} />
          </div>
        )}
        <div style={{flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', ...entryTransform('bar', prog), ...textStyle(labelText, {color: '#d4d4d8', size: Math.round(ROW_FONT * 0.92), weight: 700})}}>
          {item.label}
        </div>
        {showValue && (
          <div style={{flexShrink: 0, maxWidth: '36%', overflow: 'hidden', ...entryTransform('value', prog), ...textStyle(valueText, {color: isLeader ? accentColor : '#ffffff', size: ROW_FONT, weight: 800})}}>
            <span style={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', display: 'block', textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden'}}>
              {fmtValue(displayValue, valueFormat, currencySymbol)}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ---- Global right-side frame ----
  // The image of the position currently being revealed fills the frame: it cuts
  // in instantly (no fade) the moment its row starts, then performs its one-way
  // pan (per-position direction) over the reveal window. The pan is linear, so
  // each image keeps a constant velocity until the next position cuts in — the
  // motion never decelerates to a stop between reveals. The last revealed
  // position extends its pan across the final hold so the video ends in motion.
  let activeLabel: string | undefined;
  let activeIndex = -1;
  let activeStart = -Infinity;
  if (HAS_FRAME) {
    ranked.forEach((r, i) => {
      const st = EASE + sequencePos(i) * step;
      if (st <= frame && st >= activeStart) {
        activeLabel = r.label;
        activeIndex = i;
        activeStart = st;
      }
    });
  }
  const lastRevealIndex = revealDirection === 'asc' ? n - 1 : 0;
  const isLastReveal = activeIndex === lastRevealIndex;
  const panDenom = isLastReveal ? Math.max(step + holdFrames, 1) : Math.max(step, 1);
  const activeProg =
    activeLabel === undefined
      ? 0
      : Math.max(0, Math.min((frame - activeStart) / panDenom, 1));
  const activeItem = activeLabel !== undefined && activeIndex >= 0 ? ranked[activeIndex] : undefined;
  const panProg = rowImagePanDirs?.[activeItem?.label ?? ''] === 'rtl' ? 1 - activeProg : activeProg;
  const framePan = activeItem && rowImagePan !== false ? panProg : 0;

  // Cover-crop geometry for the frame. The image always fills the frame box
  // (`objectFit: 'cover'`, so the browser auto-rescales to match width and
  // height); zoom/focus/pan run through a top-left-origin transform. `extraX`
  // is the horizontal overflow the one-way pan travels. A guaranteed minimum
  // zoom keeps overflow in both axes so focus and pan work even when the user
  // leaves zoom at its default.
  const ZOOM_FLOOR = 1.12;
  const frameImgGeom = (label: string, pan: number) => {
    const ric = rowImageCrops?.[label];
    const z = Math.max(ric?.zoom ?? 1, ZOOM_FLOOR);
    const fx = Math.max(Math.min(ric?.focusX ?? 0, 1), -1);
    const fy = Math.max(Math.min(ric?.focusY ?? 0, 1), -1);
    const extraX = FRAME_W * (z - 1);
    const extraY = frameHeight * (z - 1);
    const clampX =
      z >= 1
        ? rowImagePan === false
          ? Math.max(-extraX, Math.min(0, -extraX / 2 - (fx * extraX) / 2))
          : Math.max(-extraX, Math.min(0, -extraX * (1 - pan) - (fx * extraX) / 4))
        : -extraX * (1 - pan) - (fx * extraX) / 4;
    const clampY = z >= 1 ? Math.max(-extraY, Math.min(0, -extraY / 2 - (fy * extraY) / 2)) : -extraY / 2 - (fy * extraY) / 2;
    return {z: Math.max(z, 0.1), tx: clampX, ty: clampY};
  };

  const frameLayer = (item: RankingItem, index: number, pan: number) => {
    const src = rowImageFor(item.label, item.image);
    if (!src) return null;
    const g = frameImgGeom(item.label, pan);
    return (
      <>
        <Img
          src={src}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            transform: `translate(${g.tx}px, ${g.ty}px) scale(${g.z})`,
            transformOrigin: '0 0',
            objectFit: 'cover',
            maxWidth: 'none',
            opacity: 1,
          }}
        />
        {rowImageLabel && (
          <div style={{position: 'absolute', left: rowImageLabelX ?? 12, top: rowImageLabelY ?? 12, pointerEvents: 'none'}}>
            <span style={{fontVariantNumeric: 'tabular-nums', textShadow: '0 1px 3px rgba(0,0,0,0.6)', ...textStyle(rowImageLabelText, {color: '#ffffff', size: Math.round(ROW_FONT * 1.35), weight: 900})}}>
              {rankPrefix}{index + 1}
            </span>
          </div>
        )}
      </>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
        padding: `${PAD_T}px ${PAD_R}px ${PAD_B}px ${PAD_L}px`,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <BackgroundLayer
        backgroundType={backgroundType}
        background={background}
        backgroundSecondary={backgroundSecondary}
        backgroundImage={backgroundImage}
        backgroundPattern={backgroundPattern}
        backgroundAngle={backgroundAngle}
        backgroundOpacity={backgroundOpacity}
        backgroundBlur={backgroundBlur}
        backgroundFit={backgroundFit}
      />
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
        fallbackTitle="Ranking"
      />
      <div style={{flex: 1, position: 'relative', marginTop: rowsMarginTop, overflow: 'hidden', transform: `translate(${rowsX ?? 0}px, ${rowsY ?? 0}px)`}}>
        <div style={{position: 'absolute', inset: 0}}>{ranked.map((r, i) => (rankMode === 'table' ? renderRowTable(r, i) : renderRow(r, i)))}</div>
      </div>
      {HAS_FRAME && (
        <div
          style={{
            position: 'absolute',
            left: frameLeftPx,
            top: frameTopPx,
            width: FRAME_W,
            height: frameHeight,
            overflow: 'hidden',
            backgroundColor: rowImageFrameBg === 'dark' ? '#111827' : 'transparent',
            borderRadius: Math.round(ROW_H * 0.35),
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {activeItem && frameLayer(activeItem, activeIndex, framePan)}
        </div>
      )}
    </div>
  );
};