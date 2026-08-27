import {NextRequest, NextResponse} from 'next/server';
import {put} from '@vercel/blob';

export const dynamic = 'force-dynamic';

/**
 * Accepts a PNG data URL, uploads it to Vercel Blob and returns a public URL.
 * Used to attach thumbnails to saved viz_specs.
 */
export async function POST(request: NextRequest) {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        {error: 'BLOB_READ_WRITE_TOKEN is not set. Create a Blob store at vercel.com → Storage.'},
        {status: 500},
      );
    }

    const body = await request.json();
    const dataUrl: string | undefined = body.dataUrl;

    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({error: 'dataUrl (PNG data URL) is required'}, {status: 400});
    }

    const mime = dataUrl.match(/^data:([^;]+);base64,/)?.[1] ?? 'image/png';
    const ext = mime === 'image/jpeg' || mime === 'image/jpg' ? 'jpg' : 'png';
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      return NextResponse.json({error: 'Invalid data URL'}, {status: 400});
    }
    const buffer = Buffer.from(base64, 'base64');

    const {url} = await put(
      `thumbnails/${Date.now()}.${ext}`,
      buffer,
      {access: 'public', contentType: mime},
    );

    return NextResponse.json({url});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({error: message}, {status: 500});
  }
}