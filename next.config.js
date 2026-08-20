/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: '..',
  },
  outputFileTracingIncludes: {
    "/api/render": [
      "./src/remotion/**/*",
      "./node_modules/dotenv/**/*",
      "./node_modules/@remotion/cli/**/*",
    ],
  },
};

module.exports = nextConfig;
