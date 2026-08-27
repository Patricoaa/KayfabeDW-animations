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

    // Read the existing row so we can bump the version on manual saves.
    const {data: existing} = await supabase
      .from('viz_spec')
      .select('version, auto_saved_at')
      .eq('id', id)
      .single();

    // Auto-saves (is_draft && was already a draft autosave) don't bump the
    // manual version counter; manual saves do.
    const bumpVersion = body.version_bump === true;
    const nextVersion = bumpVersion
      ? (existing?.version ?? 0) + 1
      : existing?.version ?? 1;

    const {data, error} = await supabase
      .from('viz_spec')
      .update({
        name: body.name,
        query_spec: body.query_spec,
        chart_config: body.chart_config,
        animation_config: body.animation_config,
        folder_id: body.folder_id ?? null,
        thumbnail_url: body.thumbnail_url ?? undefined,
        is_draft: body.is_draft,
        version: nextVersion,
        auto_saved_at: body.is_draft ? new Date().toISOString() : null,
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
