/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'remotion',
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/compositor-linux-x64-gnu',
    '@remotion/compositor-linux-x64-musl',
    '@remotion/compositor-linux-arm64-gnu',
    '@remotion/compositor-linux-arm64-musl',
    '@rspack/core',
    '@rspack/binding',
    '@rspack/binding-linux-x64-gnu',
    '@rspack/binding-linux-x64-musl',
    '@rspack/binding-linux-arm64-gnu',
    '@rspack/binding-linux-arm64-musl',
    '@sparticuz/chromium',
  ],
  outputFileTracingIncludes: {
    "/api/render": [
      "./src/remotion/**/*",
      // Lib modules that the templates VALUE-import (the runtime remotion
      // bundler resolves them inside the serverless function). Type-only
      // imports are erased at build and don't need to be traced; these do.
      "./src/lib/chart-icons.ts",
      "./src/lib/chart-config.ts",
      "./src/lib/animation-config.ts",
      "./node_modules/remotion/**/*",
      "./node_modules/@remotion/**/*",
      "./node_modules/@rspack/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
};

module.exports = nextConfig;
