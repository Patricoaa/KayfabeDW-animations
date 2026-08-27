import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
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