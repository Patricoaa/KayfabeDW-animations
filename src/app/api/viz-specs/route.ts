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
    const {data, error} = await supabase.rpc('list_viz_specs');
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
    const {data, error} = await supabase.rpc('save_viz_spec', {
      p_id: body.id ?? null,
      p_name: body.name ?? 'Sin título',
      p_query_spec: body.query_spec ?? {},
      p_chart_config: body.chart_config ?? {},
      p_animation_config: body.animation_config ?? null,
      p_folder_id: body.folder_id ?? null,
      p_is_draft: body.is_draft ?? true,
      p_version_bump: body.version_bump === true,
      p_thumbnail_url: body.thumbnail_url ?? null,
    });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}