import {bundle} from '@remotion/bundler';
import {renderMedia, getCompositions} from '@remotion/renderer';
import {put} from '@vercel/blob';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {RenderRequest} from '../../../../types/schema';
import {formatSSE, type RenderProgress} from './helpers';

let cachedBundleDir: string | null = null;

async function getBundleDir(): Promise<string> {
  if (cachedBundleDir && fs.existsSync(cachedBundleDir)) {
    return cachedBundleDir;
  }

  const entryPoint = path.join(process.cwd(), 'src', 'remotion', 'index.ts');
  cachedBundleDir = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  return cachedBundleDir;
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
    try {
      await send({type: 'phase', phase: 'Bundling Remotion project...', progress: 0});
      const bundleDir = await getBundleDir();

      await send({type: 'phase', phase: 'Finding compositions...', progress: 0.1});
      const compositions = await getCompositions(bundleDir, {
        inputProps: body.inputProps,
      });

      const composition = compositions.find((c) => c.id === body.compositionId);
      if (!composition) {
        throw new Error(`Composition "${body.compositionId}" not found`);
      }

      await send({type: 'phase', phase: 'Rendering video...', progress: 0.2});

      const tmpFile = path.join(os.tmpdir(), `render-${Date.now()}.mp4`);

      await renderMedia({
        composition,
        serveUrl: bundleDir,
        codec: 'h264',
        outputLocation: tmpFile,
        inputProps: body.inputProps,
        onProgress: ({progress}) => {
          send({
            type: 'phase',
            phase: 'Rendering video...',
            progress: 0.2 + progress * 0.6,
          });
        },
      });

      await send({type: 'phase', phase: 'Uploading video...', progress: 0.9});

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
