/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async redirects() {
    return [
      { source: '/landing', destination: '/', permanent: true },
    ];
  },
};

module.exports = nextConfig;
