export const COMP_NAME = 'RankingBarras';
export const COMP_HEAD_TO_HEAD = 'HeadToHead';
export const COMP_TIMELINE = 'TimelineReinados';
export const COMP_STATS_KPI = 'StatsKpi';
export const COMP_WIN_STREAK = 'WinStreak';
export const COMP_HEATMAP = 'HeatmapLuchas';

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const DURATION_IN_FRAMES = 30;

// --- RankingBarras ---
export type RankingBarrasItem = {
  label: string;
  value: number;
  color?: string;
};

export type RankingBarrasProps = {
  title: string;
  items: RankingBarrasItem[];
  maxValue?: number;
};

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
export type HeadToHeadProps = {
  wrestlerA: string;
  wrestlerB: string;
  winsA: number;
  winsB: number;
  draws?: number;
  titleA?: string;
  titleB?: string;
};

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
export type TimelineReign = {
  start: string;
  end: string | null;
  days: number;
  defenses: number;
};

export type TimelineReinadosProps = {
  championName: string;
  titleName: string;
  reigns: TimelineReign[];
  promotionColor?: string;
};

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
export type StatsKpiProps = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  description?: string;
  color?: string;
};

export const defaultStatsKpiProps: StatsKpiProps = {
  label: 'Total de Eventos',
  value: 2847,
  description: 'Eventos de wrestling documentados en la base de datos',
  color: '#3b82f6',
};

// --- WinStreak ---
export type WinStreakProps = {
  wrestlerName: string;
  streakCount: number;
  matchType?: string;
  events?: string[];
  promotionColor?: string;
};

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
  ],
  promotionColor: '#FFD700',
};

// --- HeatmapLuchas ---
export type HeatmapCell = {
  row: string;
  col: string;
  value: number;
};

export type HeatmapLuchasProps = {
  title: string;
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
  colorScale?: [string, string];
};

export const defaultHeatmapProps: HeatmapLuchasProps = {
  title: 'Luchas por Año y Promoción',
  rows: ['WWE', 'AEW', 'TNA', 'NJPW'],
  cols: ['2020', '2021', '2022', '2023', '2024'],
  cells: [
    {row: 'WWE', col: '2020', value: 42},
    {row: 'WWE', col: '2021', value: 56},
    {row: 'WWE', col: '2022', value: 61},
    {row: 'WWE', col: '2023', value: 58},
    {row: 'WWE', col: '2024', value: 65},
    {row: 'AEW', col: '2020', value: 28},
    {row: 'AEW', col: '2021', value: 45},
    {row: 'AEW', col: '2022', value: 52},
    {row: 'AEW', col: '2023', value: 48},
    {row: 'AEW', col: '2024', value: 55},
    {row: 'TNA', col: '2020', value: 12},
    {row: 'TNA', col: '2021', value: 18},
    {row: 'TNA', col: '2022', value: 22},
    {row: 'TNA', col: '2023', value: 25},
    {row: 'TNA', col: '2024', value: 20},
    {row: 'NJPW', col: '2020', value: 15},
    {row: 'NJPW', col: '2021', value: 20},
    {row: 'NJPW', col: '2022', value: 28},
    {row: 'NJPW', col: '2023', value: 32},
    {row: 'NJPW', col: '2024', value: 30},
  ],
};
