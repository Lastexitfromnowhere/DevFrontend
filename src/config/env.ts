export const config = {
  API_BASE_URL: `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '/api'}`, // URL de base de l'API backend avec préfixe /api
  DHT_API_URL: `${process.env.NEXT_PUBLIC_DHT_URL || '/dht'}`, // URL spécifique pour le service DHT
  POLLING_INTERVAL: 120000, // Augmenté à 2 minutes pour réduire la charge sur le serveur et éviter le rate limiting
  DEFAULT_TIMEOUT: 30000, // Augmenté à 30 secondes car Render peut être lent au démarrage
  CONNECT_TIMEOUT: 60000, // 60 secondes pour la connexion initiale
};

// Export individuel pour la rétrocompatibilité
export const API_BASE_URL = config.API_BASE_URL;
export const DHT_API_URL = config.DHT_API_URL;

export default config;
