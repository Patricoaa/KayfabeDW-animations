import {NextRequest, NextResponse} from 'next/server';
import {getSupabaseServer} from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const supabase = getSupabaseServer();
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
    const supabase = getSupabaseServer();
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
    const supabase = getSupabaseServer();
    const {error} = await supabase.from('viz_spec').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
