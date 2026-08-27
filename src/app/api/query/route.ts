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
      return NextResponse.json({error: error.message, code: error.code, details: error.details}, {status: 500});
    }

    // Supabase client returns SETOF jsonb as flat array via PostgREST
    // but may also wrap as [{query_builder: {...}}] — unwrap if needed
    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(data)) {
      rows = data.map((row: Record<string, unknown>) => {
        if (row && typeof row === 'object' && 'query_builder' in row) {
          return (row as Record<string, unknown>).query_builder as Record<string, unknown>;
        }
        return row;
      });
    } else if (data && typeof data === 'object') {
      rows = [data as Record<string, unknown>];
    }

    return NextResponse.json({data: rows});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
