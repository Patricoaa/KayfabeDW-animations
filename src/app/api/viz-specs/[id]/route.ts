import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const supabase = await createClient();
    const {data, error} = await supabase.rpc('get_viz_spec', {p_id: id});
    if (error) throw error;
    if (!data) return NextResponse.json({error: 'No encontrado'}, {status: 404});
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
    const supabase = await createClient();
    const {data, error} = await supabase.rpc('save_viz_spec', {
      p_id: id,
      p_name: body.name,
      p_query_spec: body.query_spec,
      p_chart_config: body.chart_config,
      p_animation_config: body.animation_config ?? null,
      p_folder_id: body.folder_id ?? null,
      p_is_draft: body.is_draft,
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

export async function DELETE(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const supabase = await createClient();
    const {error} = await supabase.rpc('delete_viz_spec', {p_id: id});
    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}