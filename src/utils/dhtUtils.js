// utils/dhtUtils.js
import axios from 'axios';
import { config } from '../config/env';

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
const DHT_API_BASE = config.DHT_API_URL;

// Variables locales pour le cache et l'état
let cachedStatus = null;
let lastStatusCheck = 0;
const STATUS_CACHE_TIME = 5000; // 5 secondes

// Ajouter l'en-tête d'autorisation à toutes les requêtes
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || 'dummy-token-for-dev';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

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
    const response = await axios.post(`${DHT_API_BASE}/start`, {}, {
      headers: getAuthHeaders()
    });
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
    const response = await axios.post(`${DHT_API_BASE}/stop`, {}, {
      headers: getAuthHeaders()
    });
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
  try {
    const now = Date.now();
    
    // Utiliser le cache si disponible et récent
    if (cachedStatus && (now - lastStatusCheck < STATUS_CACHE_TIME)) {
      return cachedStatus;
    }
    
    const response = await axios.get(`${DHT_API_BASE}/status`, {
      headers: getAuthHeaders()
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

// Fonction pour obtenir la liste des nœuds DHT
export const getDHTNodes = async () => {
  try {
    const response = await axios.get(`${DHT_API_BASE}/nodes`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des nœuds DHT:', error);
    return { success: false, nodes: [], error: error.message };
  }
};

// Fonction pour obtenir la liste des nœuds WireGuard
export const getWireGuardNodes = async () => {
  try {
    const response = await axios.get(`${DHT_API_BASE}/wireguard-nodes`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des nœuds WireGuard:', error);
    return { success: false, nodes: [], error: error.message };
  }
};

// Fonction pour publier un nœud WireGuard
export const publishWireGuardNode = async (walletAddress) => {
  try {
    const response = await axios.post(`${DHT_API_BASE}/wireguard-publish`, 
      { walletAddress }, 
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la publication du nœud WireGuard:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour stocker une valeur dans le DHT
export const storeDHTValue = async (key, value) => {
  try {
    const response = await axios.post(`${DHT_API_BASE}/store`, 
      { key, value }, 
      { headers: getAuthHeaders() }
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
    const response = await axios.get(`${DHT_API_BASE}/retrieve/${key}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de la valeur:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour vérifier si le backend est accessible
export const checkBackendConnection = async () => {
  try {
    const response = await axios.get(`${config.API_BASE_URL}/status`, {
      timeout: 5000
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
  getDHTNodes,
  getWireGuardNodes,
  publishWireGuardNode,
  storeDHTValue,
  retrieveDHTValue,
  checkBackendConnection
};
