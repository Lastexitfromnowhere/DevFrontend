/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://lastexitvpn.duckdns.org/api/:path*',
      },
      // Redirection spécifique pour WireGuard
      {
        source: '/wireguard/:path*',
        destination: 'https://lastexitvpn.duckdns.org/api/wireguard/:path*',
      },
      // Utiliser un chemin relatif pour DHT qui sera géré par Nginx
      {
        source: '/dht/:path*',
        destination: 'https://lastexitvpn.duckdns.org/dht/:path*',
      },
      // Redirection spécifique pour l'endpoint /status
      {
        source: '/status',
        destination: 'https://lastexitvpn.duckdns.org/dht/status',
      }
    ];
  },
  // Augmenter le timeout pour les requêtes API
  httpAgentOptions: {
    keepAlive: true,
    timeout: 60000, // 60 secondes
  },
};

module.exports = nextConfig;
