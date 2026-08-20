import {NextResponse} from 'next/server';
import {getSupabase} from '@/lib/supabase';

export async function GET(req: Request) {
  const {searchParams} = new URL(req.url);
  const type = searchParams.get('type') ?? 'title_reigns';
  const limit = Math.min(Number(searchParams.get('limit') ?? '10'), 20);
  const promotion = searchParams.get('promotion');

  const supabase = getSupabase();

  if (type === 'title_reigns') {
    const {data, error} = await supabase
      .from('v_title_timeline' as any)
      .select('champion_name, title_name, promotion_name, days_as_champion, defenses, class')
      .eq('is_vacancy', false)
      .order('days_as_champion', {ascending: false})
      .limit(limit);

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    const items = (data ?? []).map((row: any) => ({
      label: row.champion_name,
      value: row.days_as_champion,
      color: getColorForPromotion(row.promotion_name),
      meta: {title: row.title_name, promotion: row.promotion_name, defenses: row.defenses, class: row.class},
    }));

    return NextResponse.json({
      title: 'Reinados Más Largos',
      items,
      maxValue: items[0]?.value ?? 1000,
    });
  }

  if (type === 'active_champs') {
    const {data, error} = await supabase
      .from('v_title_current' as any)
      .select('title_name, champion_name, promotion_name, defense_count, class, division')
      .order('defense_count', {ascending: false})
      .limit(limit);

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    const items = (data ?? []).map((row: any) => ({
      label: row.champion_name,
      value: row.defense_count,
      color: getColorForPromotion(row.promotion_name),
      meta: {title: row.title_name, promotion: row.promotion_name, class: row.class, division: row.division},
    }));

    return NextResponse.json({
      title: 'Campeones Activos — Defensas',
      items,
      maxValue: items[0]?.value ?? 10,
    });
  }

  return NextResponse.json({error: `Unknown type: ${type}`}, {status: 400});
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
