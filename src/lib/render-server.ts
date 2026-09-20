import path from 'path';
import fs from 'fs';
import os from 'os';
import chromium from '@sparticuz/chromium';

// Shared server-side Remotion machinery for routes that render on-demand
// (/api/render and /api/thumbnail/still). Both bundle the composition entry
// with webpack and launch Chrome via @sparticuz/chromium; the bundle and the
// Chrome path are cached in-module to amortize across requests in the same
// serverless instance.

export const RENDER_ENTRY = path.join(process.cwd(), 'src', 'remotion', 'index.ts');

process.env.WEBPACK_CACHE_DIRECTORY = path.join(os.tmpdir(), 'webpack-cache');
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --no-experimental-require-module';

let cachedBundleUrl: string | null = null;
let cachedChromePath: string | null = null;

export async function getBundleUrl(): Promise<string> {
  if (cachedBundleUrl) {
    console.log('[render] Using cached bundle');
    return cachedBundleUrl;
  }
  console.log('[render] Starting webpack bundle...');
  const {bundle} = await import('@remotion/bundler');
  cachedBundleUrl = await bundle({
    entryPoint: RENDER_ENTRY,
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

export async function ensureChrome(): Promise<string> {
  if (cachedChromePath && fs.existsSync(/*turbopackIgnore: true*/ cachedChromePath)) {
    console.log('[render] Using cached Chrome at', cachedChromePath);
    return cachedChromePath;
  }
  console.log('[render] Resolving Chrome path via @sparticuz/chromium...');
  const execPath = await chromium.executablePath();
  console.log('[render] Chrome resolved at', execPath);
  cachedChromePath = execPath;
  return execPath;
}