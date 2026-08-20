/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'remotion',
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/cli',
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
  ],
  outputFileTracingIncludes: {
    "/api/render": [
      "./src/remotion/**/*",
      "./node_modules/remotion/**/*",
      "./node_modules/@remotion/**/*",
      "./node_modules/@rspack/**/*",
    ],
  },
};

module.exports = nextConfig;
