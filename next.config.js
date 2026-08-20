/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    '@remotion/renderer',
    '@remotion/bundler',
  ],
  outputFileTracingIncludes: {
    "/api/render": [
      "./src/remotion/**/*",
    ],
  },
};

module.exports = nextConfig;
