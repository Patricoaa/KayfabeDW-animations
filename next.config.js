/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/cli',
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
      "./node_modules/@rspack/**/*",
      "./node_modules/@remotion/**/*",
    ],
  },
};

module.exports = nextConfig;
