import type {SupabaseClient} from '@supabase/supabase-js';
import type {RaceScrollingProps, RaceScrollingItem} from './index';

interface TitleTimelineRow {
  champion_name: string;
  start_date: string;
  days_as_champion: number;
}

// Legacy standalone data path for the Remotion studio. Maps the live title
// timeline view into the scrolling plane shape (one traveled bar per reign,
// tip pinned to the passing axis by its start date).
export async function queryData(
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<RaceScrollingProps> {
  const champion = options.champion as string | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from('v_title_timeline' as any)
    .select('champion_name, start_date, days_as_champion')
    .eq('is_vacancy', false)
    .order('start_date', {ascending: true});

  if (champion) {
    query = query.ilike('champion_name', `%${champion}%`);
  }

  const {data, error} = await query.limit(50);

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No timeline data found');
  }

  const items: RaceScrollingItem[] = data.map((row) => {
    const r = row as TitleTimelineRow;
    const ts = Date.parse(r.start_date);
    return {
      label: r.champion_name,
      image: null,
      pos: isNaN(ts) ? 0 : ts,
      value: r.days_as_champion,
    };
  });

  const pos = items.map((i) => i.pos);
  const axisUnit = pos.some((t) => t > 1e10) ? ('date' as const) : ('number' as const);
  const domain: [number, number] = pos.length > 0 ? [Math.min(...pos), Math.max(...pos)] : [0, 1];

  return {
    title: (options.title as string | undefined) ?? 'Race Scrolling',
    items,
    accentColor: '#FFD700',
    dateMode: true,
    domain,
    axisUnit,
  };
}