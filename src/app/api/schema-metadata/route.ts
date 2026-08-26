import {NextResponse} from 'next/server';
import {getSupabaseServer} from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const {data, error} = await supabase.rpc('get_schema_metadata');
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
