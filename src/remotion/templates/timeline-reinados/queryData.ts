import type {SupabaseClient} from '@supabase/supabase-js';

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

interface TitleTimelineRow {
  champion_name: string;
  title_name: string;
  promotion_name: string;
  start_date: string;
  end_date: string | null;
  days_as_champion: number;
  defenses: number;
  is_current: boolean;
  class: string;
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
): Promise<TimelineReinadosProps> {
  const champion = options.champion as string | undefined;
  const titleId = options.titleId as number | undefined;

  if (!champion && !titleId) {
    throw new Error('Either champion or titleId is required');
  }

  let query = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('v_title_timeline' as any)
    .select('champion_name, title_name, promotion_name, start_date, end_date, days_as_champion, defenses, is_current, class')
    .eq('is_vacancy', false)
    .order('start_date', {ascending: true});

  if (champion) {
    query = query.ilike('champion_name', `%${champion}%`);
  }
  if (titleId) {
    query = query.eq('title_id', titleId);
  }

  const {data, error} = await query.limit(50);

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No reigns found');
  }

  const first = data[0] as TitleTimelineRow;
  const promotionColor = getColorForPromotion(first.promotion_name);

  const reigns = data.map((row) => {
    const r = row as TitleTimelineRow;
    return {
      start: r.start_date,
      end: r.end_date ?? null,
      days: r.days_as_champion,
      defenses: r.defenses,
    };
  });

  return {
    championName: first.champion_name,
    titleName: first.title_name,
    promotionColor,
    reigns,
  };
}
