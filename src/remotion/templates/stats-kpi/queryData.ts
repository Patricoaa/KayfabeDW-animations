import type {SupabaseClient} from '@supabase/supabase-js';

export type StatsKpiProps = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  description?: string;
  color?: string;
};

const KPI_COLUMNS = [
  'events_count',
  'matches_count',
  'wrestlers_count',
  'promotions_count',
  'titles_count',
  'stables_count',
  'venues_count',
  'active_promotions_count',
] as const;

type KpiColumn = (typeof KPI_COLUMNS)[number];

interface StatsKpiRow {
  events_count: number;
  matches_count: number;
  wrestlers_count: number;
  promotions_count: number;
  titles_count: number;
  stables_count: number;
  venues_count: number;
  active_promotions_count: number;
}

const KPI_LABELS: Record<KpiColumn, string> = {
  events_count: 'Eventos',
  matches_count: 'Luchas',
  wrestlers_count: 'Luchadores',
  promotions_count: 'Promociones',
  titles_count: 'Títulos',
  stables_count: 'Estables',
  venues_count: 'Recintos',
  active_promotions_count: 'Promociones activas',
};

export async function queryData(
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<StatsKpiProps> {
  const requested = options.kpi as KpiColumn;
  const kpi: KpiColumn =
    requested && KPI_COLUMNS.includes(requested) ? requested : 'events_count';

  let liveValue: number | null = null;
  const {data, error} = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('v_stats_kpi' as any)
    .select('*')
    .limit(1);

  if (!error && data && data.length > 0) {
    const row = data[0] as StatsKpiRow;
    liveValue = Number(row[kpi] ?? 0);
  }

  return {
    label:
      (options.label as string) ||
      KPI_LABELS[kpi] ||
      'Total de Eventos',
    value: liveValue ?? Number(options.value ?? 0),
    suffix: (options.suffix as string) || undefined,
    prefix: (options.prefix as string) || undefined,
    description: (options.description as string) || undefined,
  };
}