import {Composition} from 'remotion';
import {
  COMP_NAME,
  COMP_HEAD_TO_HEAD,
  COMP_TIMELINE,
  COMP_STATS_KPI,
  COMP_WIN_STREAK,
  COMP_HEATMAP,
  defaultRankingBarrasProps,
  defaultHeadToHeadProps,
  defaultTimelineProps,
  defaultStatsKpiProps,
  defaultWinStreakProps,
  defaultHeatmapProps,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from './types/constants';
import {RankingBarras} from './templates/RankingBarras';
import {HeadToHead} from './templates/HeadToHead';
import {TimelineReinados} from './templates/TimelineReinados';
import {StatsKpi} from './templates/StatsKpi';
import {WinStreak} from './templates/WinStreak';
import {HeatmapLuchas} from './templates/HeatmapLuchas';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={COMP_NAME}
        component={RankingBarras}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultRankingBarrasProps}
      />
      <Composition
        id={COMP_HEAD_TO_HEAD}
        component={HeadToHead}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultHeadToHeadProps}
      />
      <Composition
        id={COMP_TIMELINE}
        component={TimelineReinados}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultTimelineProps}
      />
      <Composition
        id={COMP_STATS_KPI}
        component={StatsKpi}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultStatsKpiProps}
      />
      <Composition
        id={COMP_WIN_STREAK}
        component={WinStreak}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultWinStreakProps}
      />
      <Composition
        id={COMP_HEATMAP}
        component={HeatmapLuchas}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultHeatmapProps}
      />
    </>
  );
};
