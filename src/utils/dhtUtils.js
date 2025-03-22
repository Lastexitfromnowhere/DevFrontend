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
    console.log('Démarrage du nœud DHT...');
    
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = authService.getWalletAddressFromToken();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible dans le token JWT');
    }
    
    const headers = await getAuthHeaders();
    console.log('Entêtes d\'authentification pour startDHTNode:', headers);
    
    // Démarrer le nœud DHT
    const response = await dhtAxios.post(`${DHT_API_BASE}/start`, {}, {
      headers,
      params: { walletAddress }
    });
    
    console.log('Réponse du démarrage du nœud DHT:', response.status, response.data);
    
    // Invalider le cache du statut
    cachedStatus = null;
    
    // Attendre que le nœud soit actif (avec un timeout de 10 secondes)
    let isActive = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isActive && attempts < maxAttempts) {
      attempts++;
      console.log(`Vérification de l'activation du nœud DHT (tentative ${attempts}/${maxAttempts})...`);
      
      // Attendre 1 seconde entre chaque vérification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier le statut du nœud
      const status = await getDHTStatus();
      console.log('Statut du nœud DHT:', status);
      
      if (status.success && status.isActive) {
        isActive = true;
        console.log('Le nœud DHT est maintenant actif !');
      }
    }
    
    if (!isActive) {
      console.warn('Le nœud DHT a été démarré mais n\'est pas devenu actif dans le délai imparti.');
    }
    
    return {
      ...response.data,
      isActive
    };
  } catch (error) {
    console.error('Erreur lors du démarrage du nœud DHT:', error);
    console.error('Détails de l\'erreur:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return { success: false, isActive: false, error: error.message };
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
    
    // Essayer d'abord avec l'endpoint /nodes
    try {
      // Utiliser les query params comme pour getDHTStatusByWallet
      const response = await dhtAxios.get(`${DHT_API_BASE}/nodes`, {
        headers,
        params: { walletAddress }
      });
      
      console.log('Réponse de l\'API pour les nœuds DHT (endpoint /nodes):', response.status, response.data);
      
      // Vérifier si la réponse contient des nœuds
      if (response.data && Array.isArray(response.data.nodes)) {
        console.log(`${response.data.nodes.length} nœuds DHT récupérés depuis l'API (endpoint /nodes)`);
        
        // Si la réponse contient des nœuds mais que le tableau est vide, on le signale clairement
        if (response.data.nodes.length === 0) {
          console.log('La réponse API contient un tableau de nœuds vide (endpoint /nodes)');
        } else {
          return response.data;
        }
      }
    } catch (error) {
      console.warn('Erreur avec l\'endpoint /nodes, tentative avec /nodes:', error.message);
    }
    
    // Si l'endpoint /nodes a échoué ou n'a pas retourné de nœuds, essayer avec /nodes
    try {
      const altResponse = await dhtAxios.get(`${DHT_API_BASE}/nodes`, {
        headers,
        params: { walletAddress }
      });
      
      console.log('Réponse de l\'API pour les nœuds DHT (endpoint /nodes):', altResponse.status, altResponse.data);
      
      // Vérifier si la réponse contient des nœuds
      if (altResponse.data && Array.isArray(altResponse.data.nodes)) {
        console.log(`${altResponse.data.nodes.length} nœuds DHT récupérés depuis l'API (endpoint /nodes)`);
        
        // Si la réponse contient des nœuds mais que le tableau est vide, on le signale clairement
        if (altResponse.data.nodes.length === 0) {
          console.log('La réponse API contient un tableau de nœuds vide (endpoint /nodes)');
          return { success: true, nodes: [] };
        }
        
        return altResponse.data;
      } else {
        console.log('Format de réponse inattendu: la propriété "nodes" est manquante ou n\'est pas un tableau (endpoint /nodes)');
        
        // Normaliser la réponse pour éviter les erreurs dans les composants qui utilisent ces données
        return { success: false, nodes: [], error: 'Format de réponse inattendu' };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des nœuds DHT (endpoint /nodes):', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return { success: false, nodes: [], error: error.message };
    }
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

// Fonction pour tester la connectivité du nœud DHT avec le serveur central
export const testDHTConnectivity = async () => {
  const results = {
    serverReachable: false,
    authValid: false,
    nodeRegistered: false,
    nodeActive: false,
    details: {},
    errors: []
  };
  
  try {
    // Étape 1: Vérifier si le serveur est accessible
    console.log('Test de connectivité DHT: Vérification de l\'accessibilité du serveur...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
      results.serverReachable = healthResponse.status === 200;
      results.details.serverHealth = healthResponse.data;
      console.log('Serveur accessible:', results.serverReachable, healthResponse.data);
    } catch (error) {
      results.serverReachable = false;
      results.errors.push({
        step: 'serverCheck',
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      console.error('Serveur inaccessible:', error.message);
    }
    
    // Étape 2: Vérifier l'authentification
    console.log('Test de connectivité DHT: Vérification de l\'authentification...');
    try {
      // Rafraîchir le token si nécessaire
      await authService.refreshTokenIfNeeded();
      
      // Récupérer l'adresse du wallet depuis le token JWT
      const walletAddress = authService.getWalletAddressFromToken();
      if (!walletAddress) {
        throw new Error('Adresse de wallet non disponible dans le token JWT');
      }
      
      const headers = await getAuthHeaders();
      results.details.authHeaders = { ...headers };
      // Masquer le token pour des raisons de sécurité
      if (results.details.authHeaders.Authorization) {
        results.details.authHeaders.Authorization = 'Bearer [MASKED]';
      }
      
      // Au lieu d'utiliser un endpoint spécifique pour vérifier l'authentification,
      // utilisons l'endpoint de statut DHT qui est certainement disponible
      const authTestResponse = await dhtAxios.get(`${DHT_API_BASE}/status`, { 
        headers,
        params: { walletAddress }
      });
      
      results.authValid = authTestResponse.status === 200;
      results.details.authTest = {
        status: authTestResponse.status,
        statusText: authTestResponse.statusText,
        success: authTestResponse.status === 200
      };
      console.log('Authentification valide:', results.authValid, results.details.authTest);
    } catch (error) {
      results.authValid = false;
      results.errors.push({
        step: 'authCheck',
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      console.error('Authentification invalide:', error.message);
    }
    
    // Étape 3: Vérifier si le nœud est enregistré
    console.log('Test de connectivité DHT: Vérification de l\'enregistrement du nœud...');
    try {
      const statusResponse = await getDHTStatus();
      results.nodeRegistered = statusResponse.success && statusResponse.nodeId;
      results.details.nodeStatus = statusResponse;
      console.log('Nœud enregistré:', results.nodeRegistered, statusResponse);
    } catch (error) {
      results.nodeRegistered = false;
      results.errors.push({
        step: 'registrationCheck',
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      console.error('Nœud non enregistré:', error.message);
    }
    
    // Étape 4: Vérifier si le nœud est actif
    console.log('Test de connectivité DHT: Vérification de l\'activité du nœud...');
    try {
      // Vérifier d'abord le statut local du nœud
      const statusResponse = await getDHTStatus();
      results.details.localNodeStatus = statusResponse;
      
      // Vérifier si le nœud est considéré comme actif localement
      const isLocallyActive = statusResponse.success && statusResponse.isActive;
      console.log('Nœud actif localement:', isLocallyActive, statusResponse);
      
      // Récupérer l'adresse du wallet depuis le token JWT
      const walletAddress = authService.getWalletAddressFromToken();
      
      // Essayer de récupérer le statut directement avec l'endpoint /status
      try {
        const directStatusResponse = await dhtAxios.get(`${DHT_API_BASE}/status`, {
          headers: await getAuthHeaders(),
          params: { walletAddress }
        });
        results.details.directStatusResponse = directStatusResponse.data;
        console.log('Réponse directe du statut:', directStatusResponse.data);
      } catch (error) {
        console.warn('Erreur lors de la récupération directe du statut:', error.message);
        results.details.directStatusError = {
          message: error.message,
          status: error.response?.status
        };
      }
      
      // Essayer de récupérer le nœud avec l'endpoint /node
      try {
        const nodeResponse = await dhtAxios.get(`${DHT_API_BASE}/node`, {
          headers: await getAuthHeaders(),
          params: { walletAddress }
        });
        results.details.nodeResponse = nodeResponse.data;
        console.log('Réponse de l\'endpoint /node:', nodeResponse.data);
      } catch (error) {
        console.warn('Erreur lors de la récupération du nœud avec /node:', error.message);
        results.details.nodeError = {
          message: error.message,
          status: error.response?.status
        };
      }
      
      // Récupérer la liste des nœuds actifs
      const nodesResponse = await getDHTNodes();
      
      // Vérifier si notre nœud est dans la liste des nœuds actifs
      if (nodesResponse.success && Array.isArray(nodesResponse.nodes)) {
        const ownNode = nodesResponse.nodes.find(node => node.walletAddress === walletAddress);
        results.nodeActive = !!ownNode;
        results.details.ownNode = ownNode || null;
        results.details.allNodes = nodesResponse.nodes;
        results.details.locallyActive = isLocallyActive;
        
        if (!results.nodeActive && isLocallyActive) {
          console.log('Le nœud est considéré comme actif localement mais n\'apparaît pas dans la liste des nœuds actifs');
          results.errors.push({
            step: 'activityCheck',
            message: 'Le nœud est considéré comme actif localement mais n\'apparaît pas dans la liste des nœuds actifs',
            status: 'INCONSISTENCY'
          });
        } else if (!results.nodeActive && !isLocallyActive) {
          console.log('Le nœud n\'est pas actif localement et n\'apparaît pas dans la liste des nœuds actifs');
        } else {
          console.log('Nœud actif:', results.nodeActive, ownNode);
        }
      } else {
        results.nodeActive = false;
        results.details.locallyActive = isLocallyActive;
        results.details.nodesResponse = nodesResponse;
        console.log('Nœud non trouvé dans la liste des nœuds actifs');
      }
    } catch (error) {
      results.nodeActive = false;
      results.errors.push({
        step: 'activityCheck',
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      console.error('Impossible de vérifier l\'activité du nœud:', error.message);
    }
    
    // Résumé des résultats
    console.log('Résumé du test de connectivité DHT:', {
      serverReachable: results.serverReachable,
      authValid: results.authValid,
      nodeRegistered: results.nodeRegistered,
      nodeActive: results.nodeActive,
      errors: results.errors.length
    });
    
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('Erreur lors du test de connectivité DHT:', error);
    return {
      success: false,
      error: error.message,
      ...results
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
  checkBackendConnection,
  testDHTConnectivity
};
