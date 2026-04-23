/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",   // Required for Docker / Coolify deployment
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://visioninfinity.co" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
