import {z} from 'zod';

export const COMP_NAME = 'RankingBarras';
export const COMP_HEAD_TO_HEAD = 'HeadToHead';
export const COMP_TIMELINE = 'TimelineReinados';
export const COMP_STATS_KPI = 'StatsKpi';
export const COMP_WIN_STREAK = 'WinStreak';

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const DURATION_IN_FRAMES = 300;

// --- RankingBarras ---
export const RankingBarrasItem = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

export const RankingBarrasProps = z.object({
  title: z.string(),
  items: z.array(RankingBarrasItem),
  maxValue: z.number().optional(),
});

export type RankingBarrasProps = z.infer<typeof RankingBarrasProps>;

export const defaultRankingBarrasProps: RankingBarrasProps = {
  title: 'Top Reinados Más Largos',
  items: [
    {label: 'Hulk Hogan', value: 1440, color: '#FFD700'},
    {label: 'John Cena', value: 1250, color: '#FF4500'},
    {label: 'The Rock', value: 980, color: '#1E90FF'},
    {label: 'Stone Cold', value: 870, color: '#32CD32'},
    {label: 'Triple H', value: 820, color: '#9370DB'},
  ],
};

// --- HeadToHead ---
export const HeadToHeadProps = z.object({
  wrestlerA: z.string(),
  wrestlerB: z.string(),
  winsA: z.number(),
  winsB: z.number(),
  draws: z.number().optional(),
  titleA: z.string().optional(),
  titleB: z.string().optional(),
});

export type HeadToHeadProps = z.infer<typeof HeadToHeadProps>;

export const defaultHeadToHeadProps: HeadToHeadProps = {
  wrestlerA: 'The Rock',
  wrestlerB: 'Stone Cold Steve Austin',
  winsA: 8,
  winsB: 6,
  draws: 1,
  titleA: '10x World Champion',
  titleB: '6x World Champion',
};

// --- TimelineReinados ---
export const TimelineReign = z.object({
  start: z.string(),
  end: z.string().nullable(),
  days: z.number(),
  defenses: z.number(),
});

export const TimelineReinadosProps = z.object({
  championName: z.string(),
  titleName: z.string(),
  reigns: z.array(TimelineReign),
  promotionColor: z.string().optional(),
});

export type TimelineReinadosProps = z.infer<typeof TimelineReinadosProps>;

export const defaultTimelineProps: TimelineReinadosProps = {
  championName: 'John Cena',
  titleName: 'WWE Championship',
  promotionColor: '#FFD700',
  reigns: [
    {start: '2005-04-03', end: '2005-10-09', days: 189, defenses: 8},
    {start: '2006-01-29', end: '2006-06-11', days: 133, defenses: 6},
    {start: '2007-04-01', end: '2007-09-16', days: 168, defenses: 10},
    {start: '2009-03-02', end: '2009-06-07', days: 97, defenses: 5},
    {start: '2009-09-13', end: '2010-02-21', days: 162, defenses: 9},
    {start: '2010-07-18', end: '2011-02-21', days: 217, defenses: 11},
    {start: '2011-05-01', end: '2011-05-02', days: 1, defenses: 0},
    {start: '2013-04-07', end: '2013-06-16', days: 70, defenses: 4},
    {start: '2014-02-23', end: '2014-04-07', days: 43, defenses: 2},
    {start: '2015-06-28', end: '2015-07-27', days: 29, defenses: 1},
  ],
};

// --- StatsKpi ---
export const StatsKpiProps = z.object({
  label: z.string(),
  value: z.number(),
  suffix: z.string().optional(),
  prefix: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});

export type StatsKpiProps = z.infer<typeof StatsKpiProps>;

export const defaultStatsKpiProps: StatsKpiProps = {
  label: 'Total de Eventos',
  value: 2847,
  description: 'Eventos de wrestling documentados en la base de datos',
  color: '#3b82f6',
};

// --- WinStreak ---
export const WinStreakProps = z.object({
  wrestlerName: z.string(),
  streakCount: z.number(),
  matchType: z.string().optional(),
  events: z.array(z.string()).optional(),
  promotionColor: z.string().optional(),
});

export type WinStreakProps = z.infer<typeof WinStreakProps>;

export const defaultWinStreakProps: WinStreakProps = {
  wrestlerName: 'The Undertaker',
  streakCount: 21,
  matchType: 'WrestleMania',
  events: [
    'WM VII vs Jimmy Snuka',
    'WM VIII vs Jake Roberts',
    'WM IX vs Giant Gonzalez',
    'WM XI vs King Kong Bundy',
    'WM XII vs Diesel',
    'WM 13 vs Sycho Sid',
  ],
  promotionColor: '#FFD700',
};
