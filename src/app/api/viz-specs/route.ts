import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing env vars');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getClient();
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
    const supabase = getClient();
    const {data, error} = await supabase
      .from('viz_spec')
      .insert({
        name: body.name ?? 'Sin título',
        query_spec: body.query_spec ?? {},
        chart_config: body.chart_config ?? {},
        animation_config: body.animation_config ?? null,
        folder_id: body.folder_id ?? null,
        is_draft: body.is_draft ?? true,
        version: 1,
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
