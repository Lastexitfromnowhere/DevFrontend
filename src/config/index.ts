const config = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https:
  APP_NAME: 'Wind VPN',
  REWARDS: {
    DAILY_CLAIM_AMOUNT: 10,
    CLAIM_INTERVAL_HOURS: 24,
    CONSECUTIVE_DAYS_BONUS: {
      7: 1.1,  
      14: 1.2, 
      30: 1.5  
    }
  },
  VPN: {
    STATUS_REFRESH_INTERVAL: 30000,
    NODES_REFRESH_INTERVAL: 60000,
    CONNECTED_CLIENTS_CACHE_DURATION: 60
  }
};
export default config;
