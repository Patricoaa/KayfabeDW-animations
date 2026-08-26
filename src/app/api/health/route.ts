import {NextResponse} from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return NextResponse.json({
    ok: true,
    hasUrl: !!url,
    urlPrefix: url ? url.slice(0, 30) + '...' : null,
    hasKey: !!key,
    keyPrefix: key ? key.slice(0, 20) + '...' : null,
  });
}
