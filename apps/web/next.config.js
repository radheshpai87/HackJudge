/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/landing', destination: '/', permanent: true },
    ];
  },
};

module.exports = nextConfig;
