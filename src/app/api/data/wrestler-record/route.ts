import {NextResponse} from 'next/server';
import {getSupabase} from '@/lib/supabase';

export async function GET(req: Request) {
  const {searchParams} = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '10'), 20);
  const promotion = searchParams.get('promotion');

  const supabase = getSupabase();

  const {data, error} = await supabase
    .from('v_wrestler_record' as any)
    .select('ring_name, result, matches, promotion_name')
    .order('matches', {ascending: false})
    .limit(limit * 3);

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  const aggregated = new Map<string, {wins: number; losses: number; draws: number}>();

  for (const row of data ?? []) {
    if (promotion && row.promotion_name !== promotion) continue;
    const existing = aggregated.get(row.ring_name) ?? {wins: 0, losses: 0, draws: 0};
    if (row.result === 'winner') existing.wins += row.matches;
    else if (row.result === 'loser') existing.losses += row.matches;
    else if (row.result === 'draw') existing.draws += row.matches;
    aggregated.set(row.ring_name, existing);
  }

  const items = [...aggregated.entries()]
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, limit)
    .map(([name, stats]) => ({
      label: name,
      value: stats.wins,
      color: undefined,
      meta: stats,
    }));

  return NextResponse.json({
    title: 'Más Victorias',
    items,
    maxValue: items[0]?.value ?? 100,
  });
}
