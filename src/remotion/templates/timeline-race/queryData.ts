import type {SupabaseClient} from '@supabase/supabase-js';
import type {TimelineRaceProps, TimelineRaceItem} from './index';

interface TitleTimelineRow {
  champion_name: string;
  start_date: string;
  days_as_champion: number;
}

// Legacy standalone data path for the Remotion studio. Maps the live title
// timeline view into the generic TimelineRace shape (one raced bar per reign,
// ordered by start date along the sweeping guide).
export async function queryData(
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<TimelineRaceProps> {
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

  const items: TimelineRaceItem[] = data.map((row) => {
    const r = row as TitleTimelineRow;
    const ts = Date.parse(r.start_date);
    return {
      label: r.champion_name,
      image: null,
      date: isNaN(ts) ? null : ts,
      value: r.days_as_champion,
    };
  });

  const dates = items.map((i) => i.date).filter((d): d is number => d != null);
  const dateMode = dates.length >= 2;
  const domain: [number, number] =
    dateMode && dates.length > 0
      ? [Math.min(...dates), Math.max(...dates)]
      : [0, 1];

  return {
    title: options.title as string | undefined ?? 'Timeline Race',
    items,
    accentColor: '#FFD700',
    dateMode,
    domain,
  };
}
