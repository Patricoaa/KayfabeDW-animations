import type {SupabaseClient} from '@supabase/supabase-js';

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

interface HeatmapRow {
  promotion_name: string;
  match_year: number;
  match_count: number;
}

const DEFAULT_MAX_PROMOTIONS = 8;
const DEFAULT_MAX_YEARS = 7;

export async function queryData(
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<HeatmapLuchasProps> {
  const maxPromotions = Number(options.maxPromotions ?? DEFAULT_MAX_PROMOTIONS);
  const maxYears = Number(options.maxYears ?? DEFAULT_MAX_YEARS);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {data, error} = await supabase
    .from('v_heatmap_matches' as any)
    .select('*')
    .order('match_year', {ascending: true});

  if (error) {
    throw new Error(`No se pudieron cargar los heatmap: ${error.message}`);
  }

  const rows = (data ?? []) as HeatmapRow[];
  if (rows.length === 0) {
    throw new Error('No hay luchas registradas para el heatmap');
  }

  // Total per promotion → keep the top N by total matches.
  const totals = new Map<string, number>();
  for (const r of rows) {
    totals.set(r.promotion_name, (totals.get(r.promotion_name) ?? 0) + r.match_count);
  }
  const finalPromotions = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, maxPromotions))
    .map(([name]) => name);

  // Keep the most recent N years present in the surviving promotions.
  const keptRows = rows.filter((r) => finalPromotions.includes(r.promotion_name));
  const years = [...new Set(keptRows.map((r) => r.match_year))]
    .sort((a, b) => b - a)
    .slice(0, Math.max(1, maxYears))
    .sort((a, b) => a - b);

  const cellMap = new Map<string, number>();
  for (const r of keptRows) {
    if (years.includes(r.match_year)) {
      cellMap.set(`${r.promotion_name}::${r.match_year}`, r.match_count);
    }
  }

  const cells: HeatmapCell[] = [];
  for (const promo of finalPromotions) {
    for (const year of years) {
      cells.push({row: promo, col: String(year), value: cellMap.get(`${promo}::${year}`) ?? 0});
    }
  }

  return {
    title: (options.title as string) || 'Luchas por Año y Promoción',
    rows: finalPromotions,
    cols: years.map(String),
    cells,
  };
}