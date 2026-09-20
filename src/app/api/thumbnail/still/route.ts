import {NextRequest, NextResponse} from 'next/server';
import {put} from '@vercel/blob';
import {isValidCompId} from '@/remotion/generated/schema';
import {createClient} from '@/lib/supabase/server';
import {getBundleUrl, ensureChrome} from '@/lib/render-server';

export const maxDuration = 300;

interface StillBody {
  compositionId: string;
  inputProps: Record<string, unknown>;
  durationInFrames?: number;
  width?: number;
  height?: number;
  fps?: number;
  specId?: string;
}

/**
 * Renders the LAST frame of an animated composition (Remotion renderStill at
 * `durationInFrames - 1`) and uploads it to Vercel Blob as a PNG thumbnail.
 * Called best-effort after saving an animated viz_spec, so history cards show
 * the animation's true final frame instead of a static-chart stand-in. When a
 * specId is given, the thumbnail_url is persisted on that viz_spec.
 */
export async function POST(request: NextRequest) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      {error: 'BLOB_READ_WRITE_TOKEN is not set. Create a Blob store at vercel.com → Storage.'},
      {status: 500},
    );
  }

  let body: StillBody;
  try {
    body = (await request.json()) as StillBody;
  } catch {
    return NextResponse.json({error: 'Body inválido: se esperaba JSON.'}, {status: 400});
  }

  if (!body.compositionId || !isValidCompId(body.compositionId)) {
    return NextResponse.json({error: `Invalid composition ID: ${body.compositionId}`}, {status: 400});
  }
  if (!body.inputProps || typeof body.inputProps !== 'object') {
    return NextResponse.json({error: 'inputProps is required'}, {status: 400});
  }

  try {
    console.log(`[still] Request: composition=${body.compositionId} spec=${body.specId ?? '—'}`);
    const bundleUrl = await getBundleUrl();
    const {selectComposition, renderStill} = await import('@remotion/renderer');
    const chromePath = await ensureChrome();

    const composition = await selectComposition({
      serveUrl: bundleUrl,
      id: body.compositionId,
      inputProps: body.inputProps,
      browserExecutable: chromePath,
    });

    // Mirror the render route: the client's duration/size overrides win.
    if (body.durationInFrames) {
      composition.durationInFrames = Math.round(body.durationInFrames);
    }
    if (body.width && body.height) {
      composition.width = Math.round(body.width);
      composition.height = Math.round(body.height);
    }

    // Last frame of the animation.
    const frame = Math.max(0, composition.durationInFrames - 1);
    console.log(`[still] Rendering frame ${frame}/${composition.durationInFrames - 1} at ${composition.width}x${composition.height}`);

    const {buffer, contentType} = await renderStill({
      composition,
      serveUrl: bundleUrl,
      inputProps: body.inputProps,
      frame,
      output: null,
      browserExecutable: chromePath,
      jpegQuality: 90,
    });

    if (!buffer || buffer.length === 0) {
      throw new Error('renderStill returned an empty buffer');
    }

    const {url} = await put(
      `thumbnails/still-${body.compositionId}-${Date.now()}.png`,
      buffer,
      {access: 'public', contentType: contentType || 'image/png'},
    );
    console.log(`[still] Thumbnail uploaded: ${url}`);

    // Persist on the saved view so the history card picks it up. Best-effort;
    // a failed RPC never fails the whole request.
    if (body.specId) {
      try {
        const supabase = await createClient();
        const {error} = await supabase.rpc('set_viz_spec_thumbnail', {
          p_id: body.specId,
          p_thumbnail_url: url,
        });
        if (error) throw error;
        console.log(`[still] Thumbnail attached to spec ${body.specId}`);
      } catch (err) {
        console.error('[still] Failed to attach thumbnail to spec:', err);
      }
    }

    return NextResponse.json({url});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[still] ERROR:', err);
    return NextResponse.json({error: message}, {status: 500});
  }
}