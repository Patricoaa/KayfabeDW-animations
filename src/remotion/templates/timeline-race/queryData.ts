import type {SupabaseClient} from '@supabase/supabase-js';
import type {TimelineRaceProps, TimelineRaceItem} from './index';

interface TitleTimelineRow {
  champion_name: string;
  start_date: string;
  end_date: string | null;
  days_as_champion: number;
  defenses: number;
}

// Legacy standalone data path for the Remotion studio. Maps the live title
// timeline view into the generic TimelineRace shape (one raced bar per reign).
export async function queryData(
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<TimelineRaceProps> {
  const champion = options.champion as string | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from('v_title_timeline' as any)
    .select('champion_name, start_date, end_date, days_as_champion, defenses')
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
    return {
      label: r.champion_name,
      start: r.start_date,
      end: r.end_date ?? null,
      value: r.days_as_champion,
      secondary: r.defenses,
    };
  });

  return {
    title: options.title as string | undefined ?? 'Timeline Race',
    items,
    accentColor: '#FFD700',
  };
}