import path from 'path';
import fs from 'fs';
import os from 'os';
import chromium from '@sparticuz/chromium';
import {put} from '@vercel/blob';
import {RenderRequest} from '../../../remotion/types/schema';
import {formatSSE, type RenderProgress} from './helpers';

const ENTRY = path.join(process.cwd(), 'src', 'remotion', 'index.ts');

// Vercel serverless is read-only except /tmp — point webpack/rspack cache there
process.env.WEBPACK_CACHE_DIRECTORY = path.join(os.tmpdir(), 'webpack-cache');
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --no-experimental-require-module';

let cachedBundleUrl: string | null = null;
let cachedChromePath: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (cachedBundleUrl) {
    return cachedBundleUrl;
  }
  const {bundle} = await import('@remotion/bundler');
  cachedBundleUrl = await bundle({
    entryPoint: ENTRY,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          'zod': path.join(process.cwd(), 'node_modules', 'zod', 'index.cjs'),
          'mediabunny': path.join(process.cwd(), 'src', 'remotion', 'mediabunny-stub.ts'),
          '@mediabunny/aac-encoder': path.join(process.cwd(), 'src', 'remotion', 'empty-stub.ts'),
          '@mediabunny/flac-encoder': path.join(process.cwd(), 'src', 'remotion', 'empty-stub.ts'),
          '@mediabunny/mp3-encoder': path.join(process.cwd(), 'src', 'remotion', 'empty-stub.ts'),
          '@jridgewell/trace-mapping': path.join(
            process.cwd(), 'node_modules', '@jridgewell', 'trace-mapping',
            'dist', 'trace-mapping.umd.js',
          ),
        },
      },
    }),
    onProgress: (progress: number) => {
      console.log(`Bundling: ${progress}%`);
    },
  });
  return cachedBundleUrl;
}

async function ensureChrome(): Promise<string> {
  if (cachedChromePath && fs.existsSync(cachedChromePath)) {
    return cachedChromePath;
  }
  const execPath = await chromium.executablePath();
  cachedChromePath = execPath;
  return execPath;
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

      await send({type: 'phase', phase: 'Downloading Chrome...', progress: 0.1});
      const chromePath = await ensureChrome();

      await send({type: 'phase', phase: 'Loading composition...', progress: 0.15});

      const composition = await selectComposition({
        serveUrl: bundleUrl,
        id: body.compositionId,
        inputProps: body.inputProps,
        browserExecutable: chromePath,
      });

      await send({type: 'phase', phase: 'Rendering video...', progress: 0.2});

      await renderMedia({
        composition,
        serveUrl: bundleUrl,
        codec: 'h264',
        outputLocation: tmpFile,
        inputProps: body.inputProps,
        browserExecutable: chromePath,
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
