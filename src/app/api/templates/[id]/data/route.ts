import {NextResponse} from 'next/server';
import {getSupabase} from '@/lib/supabase';
import {executeTemplateData} from '@/lib/data-executor';

export async function POST(
  req: Request,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params;
  const body = await req.json();
  const options = (body?.options as Record<string, unknown>) ?? {};

  const supabase = getSupabase();

  try {
    const props = await executeTemplateData(id, supabase, options);
    return NextResponse.json({props});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 400});
  }
}
