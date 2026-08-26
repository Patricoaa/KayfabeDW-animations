import {NextRequest, NextResponse} from 'next/server';
import {getSupabaseServer} from '@/lib/supabase';
import type {QuerySpec} from '@/lib/query-spec';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const spec: QuerySpec = body.spec;

    if (!spec || typeof spec.table !== 'string' || spec.table === '') {
      return NextResponse.json({error: 'spec.table is required'}, {status: 400});
    }

    const supabase = getSupabaseServer();
    const {data, error} = await supabase.rpc('query_builder', {spec});
    if (error) throw error;

    return NextResponse.json({data: data ?? []});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
