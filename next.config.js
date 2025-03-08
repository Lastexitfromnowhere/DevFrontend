/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://46.101.36.247:10000/api/:path*',
      },
      {
        source: '/dht/:path*',
        destination: 'http://46.101.36.247:10001/dht/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
