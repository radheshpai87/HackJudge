const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/landing', destination: '/', permanent: true },
    ];
  },
  webpack: (config, { isServer }) => {
    return config;
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu/**/*',
        'node_modules/@swc/core-linux-x64-musl/**/*',
        'node_modules/esbuild/**/*',
        'node_modules/webpack/**/*',
        'node_modules/rollup/**/*',
      ],
    },
  },
};

module.exports = nextConfig;
