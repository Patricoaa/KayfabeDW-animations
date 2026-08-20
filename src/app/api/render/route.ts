import path from 'path';
import fs from 'fs';
import os from 'os';
import {put} from '@vercel/blob';
import {RenderRequest} from '../../../../types/schema';
import {formatSSE, type RenderProgress} from './helpers';

const ENTRY = path.join(process.cwd(), 'src', 'remotion', 'index.ts');

let cachedBundleUrl: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (cachedBundleUrl) {
    return cachedBundleUrl;
  }
  const {bundle} = await import('@remotion/bundler');
  cachedBundleUrl = await bundle({
    entryPoint: ENTRY,
    onProgress: (progress: number) => {
      console.log(`Bundling: ${progress}%`);
    },
  });
  return cachedBundleUrl;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. Create a Blob store at vercel.com → Storage.',
    );
  }

  const payload = await req.json();
  const body = RenderRequest.parse(payload);

  const send = async (message: RenderProgress) => {
    await writer.write(encoder.encode(formatSSE(message)));
  };

  const runRender = async () => {
    const tmpFile = path.join(os.tmpdir(), `render-${Date.now()}.mp4`);
    try {
      await send({type: 'phase', phase: 'Bundling project...', progress: 0.05});

      const bundleUrl = await getBundleUrl();

      const {selectComposition, renderMedia} = await import('@remotion/renderer');

      await send({type: 'phase', phase: 'Loading composition...', progress: 0.15});

      const composition = await selectComposition({
        serveUrl: bundleUrl,
        id: body.compositionId,
        inputProps: body.inputProps,
      });

      await send({type: 'phase', phase: 'Rendering video...', progress: 0.2});

      await renderMedia({
        composition,
        serveUrl: bundleUrl,
        codec: 'h264',
        outputLocation: tmpFile,
        inputProps: body.inputProps,
        onProgress: ({progress}) => {
          send({type: 'phase', phase: 'Rendering video...', progress: 0.2 + progress * 0.7});
        },
      });

      await send({type: 'phase', phase: 'Uploading video...', progress: 0.95});

      const videoBuffer = fs.readFileSync(tmpFile);
      const {url} = await put(
        `renders/${body.compositionId}-${Date.now()}.mp4`,
        videoBuffer,
        {
          access: 'public',
          contentType: 'video/mp4',
        },
      );

      fs.unlinkSync(tmpFile);

      await send({type: 'done', url, size: videoBuffer.length});
    } catch (err) {
      console.error(err);
      await send({type: 'error', message: (err as Error).message});
    } finally {
      if (fs.existsSync(tmpFile)) {
        try { fs.unlinkSync(tmpFile); } catch {}
      }
      await writer.close();
    }
  };

  runRender();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
