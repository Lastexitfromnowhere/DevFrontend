/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://lastexitvpn.duckdns.org/api/:path*'
      },
      // Redirection spécifique pour l'authentification
      {
        source: '/auth/:path*',
        destination: 'https://lastexitvpn.duckdns.org/auth/:path*'
      },
      // Redirection spécifique pour WireGuard
      {
        source: '/wireguard/:path*',
        destination: 'https://lastexitvpn.duckdns.org/api/wireguard/:path*'
      },
      // Utiliser un chemin relatif pour DHT qui sera géré par Nginx
      {
        source: '/dht/:path*',
        destination: 'https://lastexitvpn.duckdns.org/dht/:path*'
      },
      // Redirection spécifique pour l'endpoint /status
      {
        source: '/status',
        destination: 'https://lastexitvpn.duckdns.org/dht/status/:walletAddress',
        has: [
          {
            type: 'header',
            key: 'X-Wallet-Address',
            value: '(?<walletAddress>.*)'
          }
        ]
      }
    ];
  },
  // Augmenter le timeout pour les requêtes API
  httpAgentOptions: {
    keepAlive: true,
    
  },
  // Ajouter les headers CORS pour les réponses
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Wallet-Address' },
        ],
      },
    ];
  },
  
  // Configuration pour les domaines autorisés
  env: {
    ALLOWED_ORIGINS: 'https://lastparadox.xyz,https://wind-frontend-rosy.vercel.app',
  },
};

module.exports = nextConfig;
