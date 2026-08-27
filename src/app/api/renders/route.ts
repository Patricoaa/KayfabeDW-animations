import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Records a finished render into animation_render (via SECURITY DEFINER RPC,
 * so no anon policies are needed on the table itself). Best-effort: the
 * caller already has the output URL and does not block on this.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.template_id || typeof body.template_id !== 'string') {
      return NextResponse.json({error: 'template_id is required'}, {status: 400});
    }
    if (!body.output_url || typeof body.output_url !== 'string') {
      return NextResponse.json({error: 'output_url is required'}, {status: 400});
    }

    const supabase = await createClient();
    const {data, error} = await supabase.rpc('record_render', {
      p_template_id: body.template_id,
      p_input_props: body.input_props ?? null,
      p_output_url: body.output_url,
      p_output_size: Number(body.output_size ?? 0),
      p_render_time_ms: Number(body.render_time_ms ?? 0),
      p_status: body.status ?? 'done',
    });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {data, error} = await supabase.rpc('list_renders', {p_limit: 50});
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}