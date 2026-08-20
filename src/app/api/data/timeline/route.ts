import {NextResponse} from 'next/server';
import {getSupabase} from '@/lib/supabase';

export async function GET(req: Request) {
  const {searchParams} = new URL(req.url);
  const champion = searchParams.get('champion');
  const titleId = searchParams.get('title_id');

  if (!champion && !titleId) {
    return NextResponse.json(
      {error: 'Either ?champion= or ?title_id= required'},
      {status: 400},
    );
  }

  const supabase = getSupabase();

  let query = supabase
    .from('v_title_timeline' as any)
    .select('champion_name, title_name, promotion_name, start_date, end_date, days_as_champion, defenses, is_current, class')
    .eq('is_vacancy', false)
    .order('start_date', {ascending: true});

  if (champion) {
    query = query.ilike('champion_name', `%${champion}%`);
  }
  if (titleId) {
    query = query.eq('title_id', Number(titleId));
  }

  const {data, error} = await query.limit(50);

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  if (!data || data.length === 0) {
    return NextResponse.json({error: 'No reigns found'}, {status: 404});
  }

  const first = data[0];
  const promotionColor = getColorForPromotion(first.promotion_name);

  const reigns = data.map((row: any) => ({
    start: row.start_date,
    end: row.end_date ?? null,
    days: row.days_as_champion,
    defenses: row.defenses,
  }));

  return NextResponse.json({
    championName: first.champion_name,
    titleName: first.title_name,
    promotionColor,
    reigns,
  });
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
