// src/config/index.ts

const config = {
  // URL de base de l'API
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  
  // Paramètres de l'application
  APP_NAME: 'Wind VPN',
  
  // Paramètres des récompenses
  REWARDS: {
    // Montant de base des récompenses quotidiennes
    DAILY_CLAIM_AMOUNT: 10,
    
    // Intervalle entre les réclamations (en heures)
    CLAIM_INTERVAL_HOURS: 24,
    
    // Bonus pour les jours consécutifs
    CONSECUTIVE_DAYS_BONUS: {
      7: 1.1,  // 10% de bonus après 7 jours
      14: 1.2, // 20% de bonus après 14 jours
      30: 1.5  // 50% de bonus après 30 jours
    }
  },
  
  // Paramètres du VPN
  VPN: {
    // Intervalle de rafraîchissement du statut du nœud (en millisecondes)
    STATUS_REFRESH_INTERVAL: 30000,
    
    // Intervalle de rafraîchissement de la liste des nœuds disponibles (en millisecondes)
    NODES_REFRESH_INTERVAL: 60000,
    
    // Durée du cache pour les clients connectés (en secondes)
    CONNECTED_CLIENTS_CACHE_DURATION: 60
  }
};

export default config;
