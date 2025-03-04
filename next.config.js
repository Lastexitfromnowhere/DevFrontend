/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://138.68.176.152:10000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
