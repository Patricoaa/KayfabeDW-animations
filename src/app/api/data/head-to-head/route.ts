import {NextResponse} from 'next/server';
import {getSupabase} from '@/lib/supabase';

export async function GET(req: Request) {
  const {searchParams} = new URL(req.url);
  const wrestlerA = searchParams.get('a');
  const wrestlerB = searchParams.get('b');

  if (!wrestlerA || !wrestlerB) {
    return NextResponse.json(
      {error: 'Both ?a= and ?b= query params required'},
      {status: 400},
    );
  }

  const supabase = getSupabase();

  const {data, error} = await supabase
    .from('v_head_to_head' as any)
    .select('*')
    .or(`and(wrestler_a_name.ilike.%25${wrestlerA}%25,wrestler_b_name.ilike.%25${wrestlerB}%25),and(wrestler_a_name.ilike.%25${wrestlerB}%25,wrestler_b_name.ilike.%25${wrestlerA}%25)`)
    .limit(50);

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  return NextResponse.json({data});
}
