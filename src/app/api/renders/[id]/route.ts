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
    const {data, error} = await supabase.rpc('get_render', {p_id: id});
    if (error) throw error;
    if (!data) return NextResponse.json({error: 'Render no encontrado'}, {status: 404});
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}