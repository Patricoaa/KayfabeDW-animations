import type {SupabaseClient} from '@supabase/supabase-js';

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

interface TitleTimelineRow {
  champion_name: string;
  title_name: string;
  promotion_name: string;
  days_as_champion: number;
  defenses: number;
  class: string;
}

interface TitleCurrentRow {
  title_name: string;
  champion_name: string;
  promotion_name: string;
  defense_count: number;
  class: string;
  division: string;
}

function getColorForPromotion(name: string): string {
  const map: Record<string, string> = {
    'WWE': '#FFD700',
    'AEW': '#00AEEF',
    'NJPW': '#C41E3A',
    'WCW': '#006400',
    'ECW': '#8B0000',
    'TNA': '#FF6600',
    'ROH': '#003366',
  };
  return map[name?.toUpperCase()] ?? '#3b82f6';
}

export async function queryData(
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<RankingBarrasProps> {
  const type = (options.type as string) ?? 'title_reigns';
  const limit = Math.min(Number(options.limit ?? 8), 20);

  if (type === 'title_reigns') {
    const {data, error} = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('v_title_timeline' as any)
      .select('champion_name, title_name, promotion_name, days_as_champion, defenses, class')
      .eq('is_vacancy', false)
      .order('days_as_champion', {ascending: false})
      .limit(limit);

    if (error) throw error;

    const items = (data as TitleTimelineRow[] | null ?? []).map((row) => ({
      label: row.champion_name,
      value: row.days_as_champion,
      color: getColorForPromotion(row.promotion_name),
    }));

    return {
      title: 'Reinados Más Largos',
      items,
      maxValue: items[0]?.value ?? 1000,
    };
  }

  if (type === 'active_champs') {
    const {data, error} = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('v_title_current' as any)
      .select('title_name, champion_name, promotion_name, defense_count, class, division')
      .order('defense_count', {ascending: false})
      .limit(limit);

    if (error) throw error;

    const items = (data as TitleCurrentRow[] | null ?? []).map((row) => ({
      label: row.champion_name,
      value: row.defense_count,
      color: getColorForPromotion(row.promotion_name),
    }));

    return {
      title: 'Campeones Activos — Defensas',
      items,
      maxValue: items[0]?.value ?? 10,
    };
  }

  throw new Error(`Unknown type: ${type}`);
}
