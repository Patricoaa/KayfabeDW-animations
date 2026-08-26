import {NextRequest, NextResponse} from 'next/server';
import {getSupabaseServer} from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const {data, error} = await supabase
      .from('viz_spec')
      .select('*')
      .order('created_at', {ascending: false});
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServer();
    const {data, error} = await supabase
      .from('viz_spec')
      .insert({
        name: body.name ?? 'Sin título',
        query_spec: body.query_spec ?? {},
        chart_config: body.chart_config ?? {},
        animation_config: body.animation_config ?? null,
        is_draft: body.is_draft ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
