import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({error: 'Missing env vars', hasUrl: !!url, hasKey: !!key}, {status: 500});
    }

    const supabase = createClient(url, key);
    const {data, error} = await supabase.rpc('get_schema_metadata');
    if (error) {
      return NextResponse.json({error: error.message, code: error.code, details: error.details}, {status: 500});
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
