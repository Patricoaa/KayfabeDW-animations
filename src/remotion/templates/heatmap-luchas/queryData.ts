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

export async function queryData(
  _supabase: unknown,
  options: Record<string, unknown>,
): Promise<HeatmapLuchasProps> {
  return {
    title: (options.title as string) ?? 'Luchas por Año y Promoción',
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
}
