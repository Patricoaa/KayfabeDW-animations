import path from 'path';
import fs from 'fs';
import os from 'os';
import chromium from '@sparticuz/chromium';
import {put} from '@vercel/blob';
import {isValidCompId} from '@/remotion/generated/schema';
import type {RenderProgress} from './helpers';

export const maxDuration = 120;

interface RenderBody {
  compositionId: string;
  inputProps: Record<string, unknown>;
  durationInFrames?: number;
  format?: 'mp4' | 'gif';
  width?: number;
  height?: number;
  fps?: number;
}

// GIF exports are memory-hungry: Remotion renders the full frame sequence and
// then runs a palette filter at the target resolution. On serverless the full
// 1920x1080@30fps pass OOM-kills FFmpeg (SIGKILL). To keep GIFs working we
// render them at a capped resolution and frame rate, which balances quality
// against the container's RAM budget.
const GIF_MAX_W = 1080;
const GIF_FPS = 12;

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
  const body = payload as RenderBody;

  if (!body.compositionId || !isValidCompId(body.compositionId)) {
    return Response.json({type: 'error', message: `Invalid composition ID: ${body.compositionId}`}, {status: 400});
  }
  if (!body.inputProps || typeof body.inputProps !== 'object') {
    return Response.json({type: 'error', message: 'inputProps is required'}, {status: 400});
  }

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

    const codec = body.format === 'gif' ? 'gif' : 'h264';
    const ext = body.format === 'gif' ? 'gif' : 'mp4';
    const contentType = body.format === 'gif' ? 'image/gif' : 'video/mp4';
    const outputFps = body.fps ?? composition.fps;

    // RRSS preset: override the composition viewport so the template re-flows
    // to the requested size (the Timeline Race reads width/height dynamically).
    if (body.width && body.height) {
      composition.width = Math.round(body.width);
      composition.height = Math.round(body.height);
    }

    // GIF: cap resolution and drop fps to avoid OOM in the render container.
    let everyNthFrame = 1;
    let scale = 1;
    if (codec === 'gif') {
      const desiredFps = Math.min(outputFps, GIF_FPS);
      everyNthFrame = Math.max(1, Math.round(composition.fps / desiredFps));
      const maxDim = Math.max(composition.width, composition.height);
      scale = maxDim > GIF_MAX_W ? GIF_MAX_W / maxDim : 1;
      console.log(`[render] GIF profile: everyNthFrame=${everyNthFrame} (→${(composition.fps / everyNthFrame).toFixed(1)}fps), scale=${scale.toFixed(3)}, ${Math.round(composition.width * scale)}x${Math.round(composition.height * scale)}`);
    }

    const tmpFile = path.join(os.tmpdir(), `render-${Date.now()}.${ext}`);
    console.log(`[render] Starting renderMedia to ${tmpFile} (codec: ${codec}, ${composition.width}x${composition.height})...`);
    await send({type: 'phase', phase: 'Rendering video...', progress: 0.2});

    await renderMedia({
      composition,
      serveUrl: bundleUrl,
      codec,
      outputLocation: tmpFile,
      inputProps: body.inputProps,
      browserExecutable: chromePath,
      concurrency: 1,
      ...(codec === 'gif' ? {everyNthFrame, scale} : {}),
      onProgress: ({progress: p}) => {
        send({type: 'phase', phase: 'Rendering video...', progress: 0.2 + p * 0.7});
      },
    });

    console.log('[render] Render complete, uploading to Vercel Blob...');
    await send({type: 'phase', phase: 'Uploading video...', progress: 0.95});

    const videoBuffer = fs.readFileSync(tmpFile);
    console.log(`[render] Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);

    const {url} = await put(
      `renders/${body.compositionId}-${Date.now()}.${ext}`,
      videoBuffer,
      {access: 'public', contentType},
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
