/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: '..',
  },
  outputFileTracingIncludes: {
    "/api/render": [
      "./src/remotion/**/*",
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@remotion/renderer', '@remotion/bundler'],
  },
};

module.exports = nextConfig;
