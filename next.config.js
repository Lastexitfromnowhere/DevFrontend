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
      {
        source: '/status',
        destination: 'http://46.101.36.247:10001/dht/status',
      },
      {
        source: '/lastexitvpn/:path*',
        destination: 'https://lastexitvpn.duckdns.org/:path*',
      },
    ];
  },
  // Augmenter le timeout pour les requêtes API
  httpAgentOptions: {
    keepAlive: true,
    timeout: 60000, // 60 secondes
  },
};

module.exports = nextConfig;
