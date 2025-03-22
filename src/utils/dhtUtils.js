// utils/dhtUtils.js
import axios from 'axios';
import { config } from '../config/env';
import { authService } from '../services/authService';

// Polyfill pour CustomEvent
if (typeof global !== 'undefined' && typeof global.CustomEvent !== 'function') {
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail || null;
      this.bubbles = options.bubbles || false;
      this.cancelable = options.cancelable || false;
    }
  };
}

// URL de base pour les requêtes DHT
const API_BASE = config.API_BASE_URL;
const DHT_API_BASE = `${API_BASE}/dht`;

// Variables locales pour le cache et l'état
let cachedStatus = null;
let lastStatusCheck = 0;
const STATUS_CACHE_TIME = 5000; // 5 secondes

// Ajouter l'en-tête d'autorisation à toutes les requêtes
const getAuthHeaders = async () => {
  // Vérifier si nous sommes dans un environnement navigateur
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await authService.refreshTokenIfNeeded()}`
    };
  }

  // Utiliser le service d'authentification pour obtenir les en-têtes
  return await authService.getAuthHeaders();
};

// Configuration Axios avec timeout et retry
const dhtAxios = axios.create({
  timeout: 30000, // 30 secondes
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter les logs et gérer les erreurs
dhtAxios.interceptors.request.use(
  async (config) => {
    console.log(`DHT Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Ajouter les en-têtes d'authentification à chaque requête
    if (!config.headers.Authorization) {
      const headers = await getAuthHeaders();
      config.headers = { ...config.headers, ...headers };
    }
    
    return config;
  },
  (error) => {
    console.error('DHT Request Error:', error);
    return Promise.reject(error);
  }
);

dhtAxios.interceptors.response.use(
  (response) => {
    console.log(`DHT Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('DHT Response Error:', error.message);
    if (error.code === 'ERR_NETWORK') {
      console.warn('Erreur réseau détectée, vérifiez votre connexion ou la disponibilité du service DHT');
    } else if (error.response?.status === 401) {
      console.warn('Erreur d\'authentification 401: Token non fourni ou invalide');
      // Essayer de rafraîchir le token en cas d'erreur 401
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        authService.refreshTokenIfNeeded().catch(err => {
          console.error('Impossible de rafraîchir le token:', err);
        });
      }
    } else if (error.response?.status === 403) {
      console.warn('Erreur d\'autorisation 403: Token invalide ou expiré');
      // Essayer de rafraîchir le token en cas d'erreur 403
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        authService.refreshTokenIfNeeded().catch(err => {
          console.error('Impossible de rafraîchir le token:', err);
        });
      }
    }
    return Promise.reject(error);
  }
);

// Fonction pour initialiser le nœud DHT
export const initDHTNode = async () => {
  try {
    console.log('Initialisation du nœud DHT');
    const status = await getDHTStatus();
    return { success: true, ...status };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du nœud DHT:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour démarrer le nœud DHT
export const startDHTNode = async () => {
  try {
    console.log('Démarrage du nœud DHT');
    const response = await dhtAxios.post(`${DHT_API_BASE}/start`, {});
    // Invalider le cache du statut
    cachedStatus = null;
    return response.data;
  } catch (error) {
    console.error('Erreur lors du démarrage du nœud DHT:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour arrêter le nœud DHT
export const stopDHTNode = async () => {
  try {
    console.log('Arrêt du nœud DHT');
    const response = await dhtAxios.post(`${DHT_API_BASE}/stop`, {});
    // Invalider le cache du statut
    cachedStatus = null;
    return response.data;
  } catch (error) {
    console.error('Erreur lors de l\'arrêt du nœud DHT:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour obtenir le statut du nœud DHT
export const getDHTStatus = async () => {
  const now = Date.now();
  
  // Utiliser le cache si disponible et récent (moins de 5 secondes)
  if (cachedStatus && lastStatusCheck && (now - lastStatusCheck < 5000)) {
    return cachedStatus;
  }
  
  try {
    const walletAddress = authService.getWalletAddress();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
    
    // Vérifier que le token est valide et correspond à l'adresse du wallet
    await authService.refreshTokenIfNeeded();
    
    // Utiliser l'adresse du wallet stockée dans le token JWT pour éviter les erreurs 403
    const tokenWalletAddress = authService.getWalletAddressFromToken();
    
    // Si les adresses ne correspondent pas, utiliser celle du token pour éviter l'erreur 403
    if (tokenWalletAddress && tokenWalletAddress !== walletAddress) {
      console.warn(`L'adresse fournie (${walletAddress}) ne correspond pas à celle du token (${tokenWalletAddress}). Utilisation de l'adresse du token.`);
      walletAddress = tokenWalletAddress;
    }
    
    console.log(`Récupération du statut DHT depuis ${DHT_API_BASE}/status avec walletAddress=${walletAddress}`);
    
    // Utiliser les query parameters au lieu des path parameters
    const response = await dhtAxios.get(`${DHT_API_BASE}/status`, {
      headers: await getAuthHeaders(),
      params: { walletAddress }
    });
    
    cachedStatus = response.data;
    lastStatusCheck = now;
    return cachedStatus;
  } catch (error) {
    console.error('Erreur lors de la récupération du statut du nœud DHT:', error);
    
    // En cas d'erreur, retourner un statut inactif
    return {
      success: false,
      isActive: false,
      error: error.message
    };
  }
};

// Nouvelle fonction pour obtenir le statut du nœud DHT par wallet
export const getDHTStatusByWallet = async (walletAddress) => {
  if (!walletAddress) {
    console.error('Erreur: adresse de wallet non fournie');
    return { success: false, error: 'Adresse de wallet non fournie' };
  }
  
  try {
    // Vérifier que le token est valide et correspond à l'adresse du wallet
    await authService.refreshTokenIfNeeded();
    
    // Utiliser l'adresse du wallet stockée dans le token JWT pour éviter les erreurs 403
    const tokenWalletAddress = authService.getWalletAddressFromToken();
    
    // Si les adresses ne correspondent pas, utiliser celle du token pour éviter l'erreur 403
    if (tokenWalletAddress && tokenWalletAddress !== walletAddress) {
      console.warn(`L'adresse fournie (${walletAddress}) ne correspond pas à celle du token (${tokenWalletAddress}). Utilisation de l'adresse du token.`);
      walletAddress = tokenWalletAddress;
    }
    
    const headers = await getAuthHeaders();
    console.log('Entêtes d\'authentification:', headers);
    console.log('Adresse du wallet utilisée pour la requête:', walletAddress);
    
    // Vérifier si le token JWT correspond à l'adresse du wallet
    const tokenMatch = await authService.verifyTokenWalletMatch();
    console.log('Le token correspond à l\'adresse du wallet:', tokenMatch);
    
    console.log('Starting Request:', {
      url: `${DHT_API_BASE}/status`,
      method: 'get',
      params: { walletAddress },
      headers: headers
    });
    
    const response = await dhtAxios.get(`${DHT_API_BASE}/status`, { 
      headers,
      params: { walletAddress }
    });
    
    console.log('Réponse du serveur:', response.status, response.data);
    return response.data;
  } catch (error) {
    console.error('Response Error:', error);
    console.error('Détails de l\'erreur:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Si l'erreur est 403, cela signifie que l'utilisateur n'est pas autorisé
    if (error.response && error.response.status === 403) {
      console.log('Génération d\'un statut de nœud inactif suite à une erreur 403');
      return { 
        success: false, 
        isActive: false,
        message: 'Non autorisé à voir ce nœud DHT' 
      };
    }
    
    // Pour toute autre erreur, retourner un statut d'erreur
    return { success: false, error: error.message };
  }
};

// Fonction pour obtenir la liste des nœuds DHT
export const getDHTNodes = async () => {
  try {
    // Rafraîchir le token si nécessaire
    await authService.refreshTokenIfNeeded();
    
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = authService.getWalletAddressFromToken();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible dans le token JWT');
    }
    
    console.log('Récupération des nœuds DHT pour le wallet:', walletAddress);
    
    const headers = await getAuthHeaders();
    console.log('Entêtes d\'authentification pour getDHTNodes:', headers);
    
    // Utiliser les query params comme pour getDHTStatusByWallet
    const response = await dhtAxios.get(`${DHT_API_BASE}/nodes`, {
      headers,
      params: { walletAddress }
    });
    
    console.log('Réponse de l\'API pour les nœuds DHT:', response.status, response.data);
    
    // Vérifier si la réponse contient des nœuds
    if (response.data && Array.isArray(response.data.nodes)) {
      console.log(`${response.data.nodes.length} nœuds DHT récupérés depuis l'API`);
    } else {
      console.log('Aucun nœud DHT trouvé dans la réponse API');
    }
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des nœuds DHT:', error);
    console.error('Détails de l\'erreur:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return { success: false, nodes: [], error: error.message };
  }
};

// Fonction pour obtenir la liste des nœuds WireGuard
export const getWireGuardNodes = async () => {
  try {
    // Rafraîchir le token si nécessaire
    await authService.refreshTokenIfNeeded();
    
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = authService.getWalletAddressFromToken();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible dans le token JWT');
    }
    
    console.log('Récupération des nœuds WireGuard pour le wallet:', walletAddress);
    
    const headers = await getAuthHeaders();
    console.log('Entêtes d\'authentification pour getWireGuardNodes:', headers);
    
    const response = await dhtAxios.get(`${DHT_API_BASE}/wireguard-nodes`, {
      headers,
      params: { walletAddress }
    });
    
    console.log('Réponse de l\'API pour les nœuds WireGuard:', response.status, response.data);
    
    // S'assurer que tous les nœuds ont un ID valide
    if (response.data.success && Array.isArray(response.data.nodes)) {
      console.log(`${response.data.nodes.length} nœuds WireGuard récupérés depuis l'API`);
      
      response.data.nodes = response.data.nodes.map(node => {
        // Si l'ID n'est pas défini ou est vide, utiliser l'adresse wallet comme ID
        if (!node.id || node.id === '') {
          return { ...node, id: node.walletAddress || `unknown-${Date.now()}` };
        }
        return node;
      });
    } else {
      console.log('Aucun nœud WireGuard trouvé dans la réponse API');
    }
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des nœuds WireGuard:', error);
    console.error('Détails de l\'erreur:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return { success: false, nodes: [], error: error.message };
  }
};

// Fonction pour publier un nœud WireGuard
export const publishWireGuardNode = async (walletAddress) => {
  try {
    // Récupérer la clé publique WireGuard si disponible
    // Note: Cette partie doit être adaptée selon la façon dont vous stockez la clé publique
    // Par exemple, vous pourriez la récupérer depuis localStorage ou une API
    const publicKey = localStorage.getItem('wireguard_public_key') || '';
    
    // Préparer les données complètes pour l'API
    const nodeInfo = {
      walletAddress,
      publicKey,
      // Ajouter d'autres informations si nécessaires
      ip: localStorage.getItem('wireguard_ip') || '',
      port: 51820, // Port standard WireGuard
      lastSeen: new Date().toISOString()
    };
    
    // Appeler l'endpoint avec les données complètes
    const response = await dhtAxios.post(`${DHT_API_BASE}/publish-node`, nodeInfo);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la publication du nœud WireGuard:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour stocker une valeur dans le DHT
export const storeDHTValue = async (key, value) => {
  try {
    // Récupérer l'adresse du wallet pour l'authentification
    const walletAddress = authService.getWalletAddress();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
    
    const response = await dhtAxios.post(`${DHT_API_BASE}/store`, 
      { key, value, walletAddress },
      { headers: await getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('Erreur lors du stockage de la valeur:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour récupérer une valeur depuis le DHT
export const retrieveDHTValue = async (key) => {
  try {
    // Récupérer l'adresse du wallet pour l'authentification
    const walletAddress = authService.getWalletAddress();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
    
    const response = await dhtAxios.get(`${DHT_API_BASE}/retrieve`, {
      params: { key, walletAddress },
      headers: await getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de la valeur:', error);
    return { success: false, value: null, error: error.message };
  }
};

// Fonction pour vérifier si le backend est accessible
export const checkBackendConnection = async () => {
  try {
    console.log(`Vérification de la connexion au backend: ${API_BASE}/status`);
    const response = await dhtAxios.get(`${API_BASE}/status`, {
      timeout: 10000 // 10 secondes
    });
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    console.error('Erreur de connexion au backend:', error);
    return { 
      success: false, 
      error: error.message,
      isNetworkError: error.code === 'ECONNABORTED' || !error.response
    };
  }
};

export default {
  initDHTNode,
  startDHTNode,
  stopDHTNode,
  getDHTStatus,
  getDHTStatusByWallet,
  getDHTNodes,
  getWireGuardNodes,
  publishWireGuardNode,
  storeDHTValue,
  retrieveDHTValue,
  checkBackendConnection
};
