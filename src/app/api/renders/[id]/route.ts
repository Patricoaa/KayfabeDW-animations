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
    const {data, error} = await supabase.rpc('get_render', {p_id: id});
    if (error) throw error;
    if (!data) return NextResponse.json({error: 'Render no encontrado'}, {status: 404});
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}