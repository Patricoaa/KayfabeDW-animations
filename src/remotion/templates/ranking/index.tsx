import React from 'react';
import {useCurrentFrame, useVideoConfig, spring, Easing} from 'remotion';
import type {RaceTextStyle} from '../../../lib/animation-config';
import {Header} from '../shared/Header';
import {BackgroundLayer} from '../shared/Background';
import {Avatar} from '../shared/Avatar';
import {textStyle} from '../shared/text';

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
// crops supported). Fully responsive: reads the composition size via
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
  rowColors?: Record<string, string>;
  rowGap?: number;
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
  rowColors,
  rowGap,
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
  const AVATAR = isPortrait ? Math.round(W * 0.09) : 48;
  const GAP = isPortrait ? 12 : 16;

  const innerW = W - PAD_L - PAD_R;
  const rowBudget = H - PAD_T - PAD_B - TITLE_SIZE * 1.4 - (isPortrait ? H * 0.12 : 100);
  const ROW_H = n <= 6 ? Math.min((rowBudget / n) * 0.7, isPortrait ? 130 : 84) : Math.max(46, (rowBudget / n) * 0.6);
  const ROW_GAP = rowGap ?? (isPortrait ? 14 : 8);
  const rowsTop = Math.max(0, (rowBudget - n * ROW_H - (n - 1) * ROW_GAP) / 2);
  const rowLaneH = ROW_H + ROW_GAP;

  const segPixelW = (rankW: number, avatarW: number) =>
    (showRank ? rankW + GAP : 0) + (avatarW > 0 ? avatarW + GAP : 0);
  const BAR_TRACK_W = Math.max(innerW - segPixelW(RANK_W, AVATAR), 80);
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
          width: innerW,
          height: ROW_H,
          display: 'flex',
          alignItems: 'center',
          gap: GAP,
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
        {hasAvatar && <Avatar src={item.image!} size={AVATAR} crop={avatarCropFor(item.label, item.image)} />}
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
                {displayValue.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
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
      <div style={{flex: 1, position: 'relative', marginTop: isPortrait ? H * 0.03 : 36, overflow: 'hidden', transform: `translate(${rowsX ?? 0}px, ${rowsY ?? 0}px)`}}>
        <div style={{position: 'absolute', inset: 0}}>{ranked.map((r, i) => renderRow(r, i))}</div>
      </div>
    </div>
  );
};