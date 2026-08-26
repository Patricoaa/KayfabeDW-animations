import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import type {QuerySpec} from '@/lib/query-spec';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const spec: QuerySpec = body.spec;

    if (!spec || typeof spec.table !== 'string' || spec.table === '') {
      return NextResponse.json({error: 'spec.table is required'}, {status: 400});
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({error: 'Missing env vars'}, {status: 500});
    }

    const supabase = createClient(url, key);
    const {data, error} = await supabase.rpc('query_builder', {spec});
    if (error) {
      return NextResponse.json({error: error.message, code: error.code}, {status: 500});
    }

    return NextResponse.json({data: data ?? []});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
