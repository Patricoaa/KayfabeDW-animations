import type {SupabaseClient} from '@supabase/supabase-js';

export type WinStreakProps = {
  wrestlerName: string;
  streakCount: number;
  matchType?: string;
  events?: string[];
  promotionColor?: string;
};

interface WinStreakRow {
  wrestler_id: number;
  wrestler_name: string;
  current_win_streak: number;
  max_win_streak: number;
  streak_last_date: string | null;
  match_count: number;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('es', {day: 'numeric', month: 'short', year: 'numeric'});
}

export async function queryData(
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<WinStreakProps> {
  const wrestlerName = (options.wrestlerName as string) ?? '';
  const matchType = (options.matchType as string) || undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from('v_win_streaks' as any).select('*');

  if (wrestlerName.trim()) {
    query = query.ilike('wrestler_name', `%${wrestlerName.trim()}%`);
  }
  query = query.order('current_win_streak', {ascending: false}).limit(1);

  const {data, error} = await query;

  if (error) {
    throw new Error(`No se pudieron cargar las rachas: ${error.message}`);
  }

  const row = (data?.[0] as WinStreakRow | undefined) ?? null;
  const streakDate = row ? formatDate(row.streak_last_date) : null;
  const events: string[] = [];
  if (row && streakDate) {
    events.push(
      `Racha actual de ${row.match_count} peleas — máxima ${row.max_win_streak} (${streakDate})`,
    );
  }

  return {
    wrestlerName: row?.wrestler_name ?? (wrestlerName || 'Sin datos'),
    streakCount: row?.current_win_streak ?? Number(options.streakCount ?? 1),
    matchType,
    events: events.length > 0 ? events : undefined,
  };
}