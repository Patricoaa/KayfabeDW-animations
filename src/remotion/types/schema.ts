import {z} from 'zod';

const RankingBarrasItem = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

const RankingBarrasProps = z.object({
  title: z.string(),
  items: z.array(RankingBarrasItem),
  maxValue: z.number().optional(),
});

const HeadToHeadProps = z.object({
  wrestlerA: z.string(),
  wrestlerB: z.string(),
  winsA: z.number(),
  winsB: z.number(),
  draws: z.number().optional(),
  titleA: z.string().optional(),
  titleB: z.string().optional(),
});

const TimelineReign = z.object({
  start: z.string(),
  end: z.string().nullable(),
  days: z.number(),
  defenses: z.number(),
});

const TimelineReinadosProps = z.object({
  championName: z.string(),
  titleName: z.string(),
  reigns: z.array(TimelineReign),
  promotionColor: z.string().optional(),
});

const StatsKpiProps = z.object({
  label: z.string(),
  value: z.number(),
  suffix: z.string().optional(),
  prefix: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});

const WinStreakProps = z.object({
  wrestlerName: z.string(),
  streakCount: z.number(),
  matchType: z.string().optional(),
  events: z.array(z.string()).optional(),
  promotionColor: z.string().optional(),
});

const HeatmapLuchasProps = z.object({
  title: z.string(),
  rows: z.array(z.string()),
  cols: z.array(z.string()),
  cells: z.array(z.object({row: z.string(), col: z.string(), value: z.number()})),
  colorScale: z.tuple([z.string(), z.string()]).optional(),
});

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
