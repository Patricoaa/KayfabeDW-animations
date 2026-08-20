import path from 'path';
import fs from 'fs';
import os from 'os';
import chromium from '@sparticuz/chromium';
import {put} from '@vercel/blob';
import {RenderRequest} from '../../../remotion/types/schema';
import type {RenderProgress} from './helpers';

export const maxDuration = 120;

const ENTRY = path.join(process.cwd(), 'src', 'remotion', 'index.ts');

process.env.WEBPACK_CACHE_DIRECTORY = path.join(os.tmpdir(), 'webpack-cache');
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --no-experimental-require-module';

let cachedBundleUrl: string | null = null;
let cachedChromePath: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (cachedBundleUrl) {
    console.log('[render] Using cached bundle');
    return cachedBundleUrl;
  }
  console.log('[render] Starting webpack bundle...');
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
      if (progress % 20 === 0 || progress === 100) {
        console.log(`[render] Bundling: ${progress}%`);
      }
    },
  });
  console.log('[render] Bundle ready:', cachedBundleUrl);
  return cachedBundleUrl;
}

async function ensureChrome(): Promise<string> {
  if (cachedChromePath && fs.existsSync(cachedChromePath)) {
    console.log('[render] Using cached Chrome at', cachedChromePath);
    return cachedChromePath;
  }
  console.log('[render] Resolving Chrome path via @sparticuz/chromium...');
  const execPath = await chromium.executablePath();
  console.log('[render] Chrome resolved at', execPath);
  cachedChromePath = execPath;
  return execPath;
}

export async function POST(req: Request) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set. Create a Blob store at vercel.com → Storage.');
  }

  const payload = await req.json();
  const body = RenderRequest.parse(payload);
  console.log(`[render] Request: composition=${body.compositionId}`);

  const progress: RenderProgress[] = [];
  const send = async (message: RenderProgress) => {
    progress.push(message);
    console.log(`[render] ${message.type === 'phase' ? message.phase : message.type}: ${JSON.stringify(message)}`);
  };

  try {
    await send({type: 'phase', phase: 'Bundling project...', progress: 0.05});
    const bundleUrl = await getBundleUrl();

    const {selectComposition, renderMedia} = await import('@remotion/renderer');

    await send({type: 'phase', phase: 'Downloading Chrome...', progress: 0.1});
    const chromePath = await ensureChrome();

    console.log(`[render] selectComposition: id=${body.compositionId}, serveUrl=${bundleUrl.slice(0, 80)}...`);
    await send({type: 'phase', phase: 'Loading composition...', progress: 0.15});
    const composition = await selectComposition({
      serveUrl: bundleUrl,
      id: body.compositionId,
      inputProps: body.inputProps,
      browserExecutable: chromePath,
    });
    console.log(`[render] Composition loaded: ${composition.width}x${composition.height} @ ${composition.fps}fps, ${composition.durationInFrames} frames`);

    if (body.durationInFrames) {
      console.log(`[render] Overriding duration: ${composition.durationInFrames} → ${body.durationInFrames} frames`);
      composition.durationInFrames = body.durationInFrames;
    }

    const tmpFile = path.join(os.tmpdir(), `render-${Date.now()}.mp4`);
    console.log(`[render] Starting renderMedia to ${tmpFile}...`);
    await send({type: 'phase', phase: 'Rendering video...', progress: 0.2});

    await renderMedia({
      composition,
      serveUrl: bundleUrl,
      codec: 'h264',
      outputLocation: tmpFile,
      inputProps: body.inputProps,
      browserExecutable: chromePath,
      concurrency: 1,
      onProgress: ({progress: p}) => {
        send({type: 'phase', phase: 'Rendering video...', progress: 0.2 + p * 0.7});
      },
    });

    console.log('[render] Render complete, uploading to Vercel Blob...');
    await send({type: 'phase', phase: 'Uploading video...', progress: 0.95});

    const videoBuffer = fs.readFileSync(tmpFile);
    console.log(`[render] Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);

    const {url} = await put(
      `renders/${body.compositionId}-${Date.now()}.mp4`,
      videoBuffer,
      {access: 'public', contentType: 'video/mp4'},
    );

    try { fs.unlinkSync(tmpFile); } catch {}

    await send({type: 'done', url, size: videoBuffer.length});
    console.log(`[render] Done: ${url}`);
  } catch (err) {
    console.error('[render] ERROR:', err);
    await send({type: 'error', message: (err as Error).message});
  }

  const last = progress[progress.length - 1];
  return Response.json(last);
}
