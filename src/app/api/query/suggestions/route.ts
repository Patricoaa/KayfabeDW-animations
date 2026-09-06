import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const {searchParams} = new URL(request.url);
    const table = searchParams.get('table') ?? '';
    const column = searchParams.get('column') ?? '';

    if (!table || !column) {
      return NextResponse.json({error: 'table and column are required'}, {status: 400});
    }

    const supabase = await createClient();
    const {data, error} = await supabase.rpc('get_filter_suggestions', {
      p_table: table,
      p_column: column,
    });
    if (error) {
      return NextResponse.json({error: error.message, code: error.code, details: error.details}, {status: 500});
    }

    const values: string[] = Array.isArray(data?.values) ? data.values : [];
    return NextResponse.json({column, values});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}
