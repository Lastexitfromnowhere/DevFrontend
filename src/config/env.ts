export const config = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api', // URL de base de l'API backend
  POLLING_INTERVAL: 120000, // Augmenté à 2 minutes pour réduire la charge sur le serveur et éviter le rate limiting
  DEFAULT_TIMEOUT: 30000, // Augmenté à 30 secondes car Render peut être lent au démarrage
  CONNECT_TIMEOUT: 60000, // 60 secondes pour la connexion initiale
};

export default config;

