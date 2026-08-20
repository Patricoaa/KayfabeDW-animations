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
};

module.exports = nextConfig;
