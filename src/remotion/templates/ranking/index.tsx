import React from 'react';
import {useCurrentFrame, useVideoConfig, spring, Easing, Img} from 'remotion';
import type {RaceTextStyle, ValueFormat} from '../../../lib/animation-config';
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
// crops supported). With `rowImages` set, a global frame takes the right side
// of the canvas, the rows squeeze to the left, and the frame shows the image
// of the position being revealed (crossfade + one-way left→right pan). Fully
// responsive: reads the composition size via
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
  rankPrefix?: string;
  avatarCrops?: Record<string, {zoom?: number; focusX?: number; focusY?: number}>;
  avatarSize?: number;
  avatarShape?: 'circle' | 'rounded';
  avatarRadius?: number;
  rowColors?: Record<string, string>;
  rowImages?: Record<string, string>;
  rowImageCrops?: Record<string, {zoom?: number; focusX?: number; focusY?: number}>;
  rowImageWidth?: number;
  rowImageHeight?: number;
  rowImageX?: number;
  rowImageY?: number;
  rowImagePan?: boolean;
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
  rankPrefix = '#',
  avatarCrops,
  avatarSize,
  avatarShape = 'circle',
  avatarRadius,
  rowColors,
  rowImages,
  rowImageCrops,
  rowImageWidth,
  rowImageHeight,
  rowImageX,
  rowImageY,
  rowImagePan = true,
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

  const limited = maxRows && maxRows > 0 ? rows.slice(0, maxRows) : rows;
  // Final ranking: best value on top, rank 1 = index 0.
  const ranked = [...limited].sort((a, b) => b.value - a.value);
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
  const GAP = isPortrait ? 12 : 16;
  const GAP_H = rowGapH ?? GAP;

  const innerW = W - PAD_L - PAD_R;

  // Split layout when per-position images are configured: a global frame takes
  // the right side of the canvas and the ranking rows squeeze to the left.
  const HAS_FRAME = rowImages != null && Object.keys(rowImages).length > 0;
  const FRAME_W0 = rowImageWidth ?? Math.round(innerW * 0.36);
  const FRAME_W = HAS_FRAME ? Math.min(Math.max(Math.round(FRAME_W0), 60), Math.round(innerW * 0.7)) : 0;
  const FRAME_GAP = HAS_FRAME ? GAP_H : 0;
  const rowsInnerW = HAS_FRAME ? Math.max(innerW - FRAME_W - FRAME_GAP, 80) : innerW;
  const rowsMarginTop = isPortrait ? Math.round(H * 0.03) : 36;
  const frameHDefault = Math.max(80, Math.round(H - PAD_B - (PAD_T + TITLE_SIZE * 1.4 + rowsMarginTop)));
  const frameHeight = rowImageHeight ?? frameHDefault;
  const frameLeftPx = HAS_FRAME ? Math.round(PAD_L + rowsInnerW + FRAME_GAP + (rowImageX ?? 0)) : 0;
  const frameTopPx = HAS_FRAME ? Math.round(PAD_T + rowsMarginTop + (rowImageY ?? 0)) : 0;

  const rowBudget = H - PAD_T - PAD_B - TITLE_SIZE * 1.4 - (isPortrait ? H * 0.12 : 100);
  const ROW_H = n <= 6 ? Math.min((rowBudget / n) * 0.7, isPortrait ? 130 : 84) : Math.max(46, (rowBudget / n) * 0.6);
  const ROW_GAP = rowGap ?? (isPortrait ? 14 : 8);
  const rowsTop = Math.max(0, (rowBudget - n * ROW_H - (n - 1) * ROW_GAP) / 2);
  const rowLaneH = ROW_H + ROW_GAP;

  const segPixelW = (rankW: number, avatarW: number) =>
    (showRank ? rankW + GAP_H : 0) + (avatarW > 0 ? avatarW + GAP_H : 0);
  const BAR_FACTOR = Math.min(Math.max(barWidth ?? 1, 0.4), 1.5);
  const BAR_TRACK_W = Math.max(Math.round((rowsInnerW - segPixelW(RANK_W, AVATAR)) * BAR_FACTOR), 80);
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

  const renderRow = (item: RankingItem, index: number) => {
    const start = EASE + sequencePos(index) * step;
    const prog = Math.max(0, Math.min((frame - start) / Math.max(step, 1), 1));
    const easeOut = Easing.out(Easing.cubic)(prog);
    const shown = prog >= 1;
    const isLeader = index === 0;

    const pop = spring({fps, frame: frame - start, config: {damping: 20, stiffness: 110}, durationInFrames: Math.max(step, 1)});
    const barW = (item.value / maxValue) * BAR_TRACK_W * pop;
    const fill = rowColors?.[item.label] ?? (isLeader ? accentColor : '#475569');

    // Count-up datum (or static value when `countUp` is off).
    const displayValue = countUp ? Math.round(item.value * easeOut) : item.value;

    const rowFinalY = rowsTop + index * rowLaneH;
    const dropFrom = rowFinalY + ROW_H + ROW_GAP + ROW_H * 0.4;
    const top = rowFinalY + (dropFrom - rowFinalY) * (1 - easeOut);

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
          opacity: Math.min(pop, 1),
        }}
      >
        {showRank && (
          <div style={{width: RANK_W, flexShrink: 0, textAlign: 'left'}}>
            <span style={{fontVariantNumeric: 'tabular-nums', ...textStyle(rankText, {color: isLeader ? accentColor : '#94a3b8', size: Math.round(ROW_FONT * (isLeader ? 1.25 : 1.05)), weight: 900})}}>
              {laneLabel}
            </span>
          </div>
        )}
        {hasAvatar && <Avatar src={item.image!} size={AVATAR} shape={avatarShape} radius={avatarRadius} crop={avatarCropFor(item.label, item.image)} />}
        <div style={{flex: 1, height: BAR_H, position: 'relative', display: 'flex', alignItems: 'center'}}>
          {showRail !== false && (
            <div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: GROOVE_H, transform: 'translateY(-50%)', backgroundColor: '#171717', borderRadius: 999, opacity: pop}} />
          )}
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', display: 'flex', alignItems: 'center', zIndex: 1}}>
            <div style={{flexShrink: 0, maxWidth: '62%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: 10, ...textStyle(labelText, {color: '#d4d4d8', size: Math.round(ROW_FONT * 0.92), weight: 700})}}>
              {item.label}
            </div>
          </div>
          <div style={{position: 'absolute', left: 0, top: '50%', width: Math.max(0, barW), height: BAR_H, transform: 'translateY(-50%)', backgroundColor: fill, borderRadius: 999, boxShadow: isLeader && shown ? `0 0 ${18}px ${accentColor}99` : 'none'}} />
          {showValue && (
            <div style={{position: 'absolute', right: 12, top: 0, bottom: 0, maxWidth: Math.max(0, barW - 24), minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden', pointerEvents: 'none', zIndex: 2}}>
              <span style={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.45)', ...textStyle(valueText, {color: isLeader ? '#000000' : '#ffffff', size: ROW_FONT, weight: 800})}}>
                {fmtValue(displayValue, valueFormat, currencySymbol)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- Global right-side frame ----
  // The image of the position currently being revealed fills the frame: it
  // crossfades from the previous position and pans left→right once (slow, over
  // the reveal window, so the travel lasts until the next position drops in).
  let activeLabel: string | undefined;
  let activeStart = -Infinity;
  let prevLabel: string | undefined;
  if (HAS_FRAME) {
    ranked.forEach((r, i) => {
      const st = EASE + sequencePos(i) * step;
      if (st <= frame && st >= activeStart) {
        if (activeLabel !== undefined) prevLabel = activeLabel;
        activeLabel = r.label;
        activeStart = st;
      }
    });
  }
  const activeProg =
    activeLabel === undefined
      ? 0
      : Math.max(0, Math.min((frame - activeStart) / Math.max(step, 1), 1));
  const frameFade = Easing.out(Easing.cubic)(activeProg);
  const framePrevFade = activeProg < 1 ? 1 - frameFade : 0;
  const framePan = rowImagePan !== false ? Easing.out(Easing.cubic)(activeProg) : 0;

  // Cover-crop geometry for the frame: the image scales by each entity's zoom
  // beyond the frame size and the focus shifts it; the horizontal overflow
  // (`extraX`) is what the one-way pan travels.
  const frameImgGeom = (label: string, pan: number) => {
    const ric = rowImageCrops?.[label];
    const z = Math.max(ric?.zoom ?? 1, 0.1);
    const fx = Math.max(Math.min(ric?.focusX ?? 0, 1), -1);
    const fy = Math.max(Math.min(ric?.focusY ?? 0, 1), -1);
    const extraX = FRAME_W * (z - 1);
    const extraY = frameHeight * (z - 1);
    return {
      w: FRAME_W * z,
      h: frameHeight * z,
      x: (fx * extraX) / 2 - extraX / 2 + extraX * pan,
      y: (fy * extraY) / 2 - extraY / 2,
    };
  };

  const frameLayer = (label: string, pan: number, opacity: number) => {
    const src = rowImages?.[label];
    if (!src) return null;
    const g = frameImgGeom(label, pan);
    return (
      <Img
        src={src}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: g.w,
          height: g.h,
          transform: `translate(${g.x}px, ${g.y}px)`,
          objectFit: 'cover',
          maxWidth: 'none',
          opacity,
        }}
      />
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
        <div style={{position: 'absolute', inset: 0}}>{ranked.map((r, i) => renderRow(r, i))}</div>
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
            backgroundColor: '#111827',
            borderRadius: Math.round(ROW_H * 0.35),
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {prevLabel && frameLayer(prevLabel, 1, framePrevFade)}
          {activeLabel && frameLayer(activeLabel, framePan, frameFade)}
        </div>
      )}
    </div>
  );
};