import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing env vars');
  return createClient(url, key);
}

export async function GET(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const supabase = getClient();
    const {data, error} = await supabase
      .from('viz_spec')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}

export async function PUT(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const body = await request.json();
    const supabase = getClient();
    const {data, error} = await supabase
      .from('viz_spec')
      .update({
        name: body.name,
        query_spec: body.query_spec,
        chart_config: body.chart_config,
        animation_config: body.animation_config,
        is_draft: body.is_draft,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}

export async function DELETE(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const supabase = getClient();
    const {error} = await supabase.from('viz_spec').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
