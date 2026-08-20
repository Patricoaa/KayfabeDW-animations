import {z} from 'zod';
import {
  RankingBarrasProps,
  HeadToHeadProps,
  TimelineReinadosProps,
  StatsKpiProps,
  WinStreakProps,
  HeatmapLuchasProps,
} from './constants';

export const RenderRequest = z.object({
  compositionId: z.string(),
  inputProps: z.union([
    RankingBarrasProps,
    HeadToHeadProps,
    TimelineReinadosProps,
    StatsKpiProps,
    WinStreakProps,
    HeatmapLuchasProps,
  ]),
});

export type RenderResponse =
  | {type: 'error'; message: string}
  | {type: 'done'; url: string; size: number};
