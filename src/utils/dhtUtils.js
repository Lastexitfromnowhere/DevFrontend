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
// Utiliser un chemin relatif pour que les requêtes passent par le proxy API configuré dans next.config.js
const API_BASE = '/api';
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
export const startDHTNode = async (walletAddressParam, deviceIdParam) => {
  try {
    // Utiliser les paramètres s'ils sont fournis, sinon utiliser les valeurs par défaut
    const walletAddress = walletAddressParam || authService.getWalletAddressFromToken();
    const deviceId = deviceIdParam || getDeviceId();
    
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
    
    console.log('Démarrage du nœud DHT pour le wallet:', walletAddress, 'sur l\'appareil:', deviceId);
    
    // Vérifier d'abord si le nœud est déjà actif
    const status = await getDHTStatusByWallet(walletAddress, deviceId);
    if (status.isActive || status.active) {
      console.log('Le nœud DHT est déjà actif.');
      return { success: true, ...status };
    }
    
    // Démarrer le nœud DHT
    const response = await dhtAxios.post(`${DHT_API_BASE}/start`, { 
      walletAddress,
      deviceId 
    });
    
    // Invalider le cache du statut
    cachedStatus = null;
    
    // Attendre que le nœud soit actif
    let isActive = false;
    let retries = 0;
    const maxRetries = 10;
    
    while (!isActive && retries < maxRetries) {
      // Attendre 2 secondes entre chaque vérification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Vérifier le statut du nœud
      const statusCheck = await getDHTStatusByWallet(walletAddress, deviceId);
      isActive = statusCheck.isActive || statusCheck.active;
      
      retries++;
      
      if (isActive) {
        isActive = true;
        console.log('Le nœud DHT est maintenant actif !');
      }
    }
    
    if (!isActive) {
      console.warn('Le nœud DHT a été démarré mais n\'est pas devenu actif dans le délai imparti.');
    }
    
    return {
      ...response.data,
      isActive,
      success: true
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
export const stopDHTNode = async (walletAddressParam, deviceIdParam) => {
  try {
    // Utiliser les paramètres s'ils sont fournis, sinon utiliser les valeurs par défaut
    const walletAddress = walletAddressParam || authService.getWalletAddressFromToken();
    const deviceId = deviceIdParam || getDeviceId();
    
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
    
    console.log('Arrêt du nœud DHT pour le wallet:', walletAddress, 'sur l\'appareil:', deviceId);
    const response = await dhtAxios.post(`${DHT_API_BASE}/stop`, { 
      walletAddress,
      deviceId 
    });
    
    // Invalider le cache du statut
    cachedStatus = null;
    
    return { ...response.data, success: true };
  } catch (error) {
    console.error('Erreur lors de l\'arrêt du nœud DHT:', error);
    console.error('Détails de l\'erreur:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
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
    
    // Récupérer l'ID de l'appareil
    const deviceId = getDeviceId();
    
    // Vérifier que le token est valide et correspond à l'adresse du wallet
    await authService.refreshTokenIfNeeded();
    
    // Utiliser l'adresse du wallet stockée dans le token JWT pour éviter les erreurs 403
    const tokenWalletAddress = authService.getWalletAddressFromToken();
    
    // Si les adresses ne correspondent pas, utiliser celle du token pour éviter l'erreur 403
    if (tokenWalletAddress && tokenWalletAddress !== walletAddress) {
      console.warn(`L'adresse fournie (${walletAddress}) ne correspond pas à celle du token (${tokenWalletAddress}). Utilisation de l'adresse du token.`);
      walletAddress = tokenWalletAddress;
    }
    
    console.log(`Récupération du statut DHT depuis ${DHT_API_BASE}/status avec walletAddress=${walletAddress} et deviceId=${deviceId}`);
    
    // Utiliser les query parameters au lieu des path parameters
    const response = await dhtAxios.get(`${DHT_API_BASE}/status`, {
      headers: await getAuthHeaders(),
      params: { 
        walletAddress,
        deviceId
      }
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
export const getDHTStatusByWallet = async (walletAddress, deviceIdParam) => {
  if (!walletAddress) {
    console.error('Erreur: adresse de wallet non fournie');
    return { success: false, error: 'Adresse de wallet non fournie' };
  }
  
  // S'assurer que nous avons toujours un deviceId
  const deviceId = deviceIdParam || getDeviceId();
  console.log('Utilisation de deviceId:', deviceId);
  
  try {
    // Vérifier que le token est valide
    await authService.refreshTokenIfNeeded();
    
    // Obtenir l'adresse du wallet depuis le token JWT
    const tokenWalletAddress = authService.getWalletAddressFromToken();
    
    // Si les adresses ne correspondent pas, régénérer un token avec l'adresse fournie
    if (tokenWalletAddress && tokenWalletAddress !== walletAddress) {
      console.warn(`L'adresse fournie (${walletAddress}) ne correspond pas à celle du token (${tokenWalletAddress}). Régénération du token...`);
      
      try {
        // Générer un nouveau token avec l'adresse du wallet fournie
        const { token, expiresAt } = await authService.generateToken(walletAddress);
        authService.saveToken(token, expiresAt, walletAddress);
        console.log('Nouveau token généré pour le wallet:', walletAddress);
      } catch (tokenError) {
        console.error('Erreur lors de la génération du token:', tokenError);
        // En cas d'erreur de génération de token, continuer avec l'adresse fournie
      }
    }
    
    const headers = await getAuthHeaders();
    console.log('Entêtes d\'authentification:', headers);
    console.log('Adresse du wallet utilisée pour la requête:', walletAddress);
    
    // Ajouter un paramètre de cache-busting pour éviter les problèmes de cache
    const cacheBuster = Date.now();
    
    // Créer les paramètres de requête - TOUJOURS inclure deviceId
    const params = { 
      walletAddress,
      deviceId,  // Toujours inclure l'ID de l'appareil
      _cb: cacheBuster  // Paramètre de cache-busting
    };
    
    console.log('Starting Request:', {
      url: `${DHT_API_BASE}/status`,
      method: 'get',
      params: params,
      headers: headers
    });
    
    // Vérifier directement le statut sans essayer de démarrer le nœud
    const response = await dhtAxios.get(`${DHT_API_BASE}/status`, { 
      headers,
      params: params
    });
    
    console.log('Réponse du serveur:', response.status, response.data);
    
    // Si la réponse indique que le nœud est inactif mais que nous savons qu'il est actif,
    // faisons une seconde tentative sans utiliser le cache
    if (response.data && (response.data.isActive === false || response.data.active === false)) {
      console.log('Le serveur indique que le nœud est inactif, tentative de vérification directe...');
      
      // Attendre un court instant avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Réessayer avec un nouveau token frais
      try {
        const { token, expiresAt } = await authService.generateToken(walletAddress);
        authService.saveToken(token, expiresAt, walletAddress);
        
        const freshHeaders = await getAuthHeaders();
        const retryResponse = await dhtAxios.get(`${DHT_API_BASE}/status`, { 
          headers: freshHeaders,
          params: { 
            walletAddress,
            deviceId,  // S'assurer d'inclure deviceId dans la seconde tentative
            _cb: Date.now()  // Nouveau paramètre de cache-busting
          }
        });
        
        console.log('Réponse de la seconde tentative:', retryResponse.status, retryResponse.data);
        
        return retryResponse.data;
      } catch (retryError) {
        console.error('Erreur lors de la seconde tentative:', retryError);
        // En cas d'erreur, continuer avec la réponse originale
      }
    }
    
    // Forcer la propriété active à true si isActive est true
    if (response.data && response.data.isActive === true) {
      response.data.active = true;
    }
    
    // Ajouter un log détaillé pour le débogage
    console.log('Statut DHT final retourné au frontend:', {
      walletAddress,
      deviceId,
      isActive: response.data?.isActive,
      active: response.data?.active,
      nodeId: response.data?.nodeId
    });
    
    // S'assurer que la propriété isActive est correctement définie
    if (response.data) {
      // Si active est true, s'assurer que isActive l'est aussi
      if (response.data.active === true && response.data.isActive !== true) {
        console.log('Correction: active est true mais isActive ne l\'est pas, définition de isActive à true');
        response.data.isActive = true;
      }
      
      // Si nodeId existe, cela indique généralement un nœud actif
      if (response.data.nodeId && !response.data.isActive && !response.data.active) {
        console.log('Correction: nodeId existe mais le nœud est marqué comme inactif, définition de isActive à true');
        response.data.isActive = true;
        response.data.active = true;
      }
    }
    
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
// Ancienne fonction, à remplacer côté front par getActiveDHTNodes pour la vraie liste live
export const getDHTNodes = async (useDemoNodes = true) => {
  return [];
};

// Nouvelle fonction pour récupérer les nœuds DHT vivants
export const getActiveDHTNodes = async () => {
  try {
    const response = await dhtAxios.get('/api/dht/active-nodes');
    if (response.data && Array.isArray(response.data.nodes)) {
      return response.data.nodes;
    }
    return [];
  } catch (error) {
    console.error('Erreur récupération active DHT nodes:', error);
    return [];
  }
};

// Fonction pour récupérer la liste des nœuds WireGuard
export const getWireGuardNodes = async () => {
  try {
    // Rafraîchir le token si nécessaire
    await authService.refreshTokenIfNeeded();
    
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = authService.getWalletAddressFromToken();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible dans le token JWT');
    }
    
    // Récupérer l'ID de l'appareil
    const deviceId = getDeviceId();
    
    console.log('Récupération des nœuds WireGuard pour le wallet:', walletAddress, 'et deviceId:', deviceId);
    
    const headers = await getAuthHeaders();
    console.log('Entêtes d\'authentification pour getWireGuardNodes:', headers);
    
    const response = await dhtAxios.get(`${DHT_API_BASE}/wireguard-nodes`, {
      headers,
      params: { 
        walletAddress,
        deviceId
      }
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
    // Récupérer l'ID de l'appareil
    const deviceId = getDeviceId();
    
    // Récupérer la configuration WireGuard existante
    const serverPublicKey = localStorage.getItem('wireguard_server_public_key') || '';
    const serverIp = localStorage.getItem('wireguard_server_ip') || '46.101.36.247'; // IP par défaut du serveur
    
    // Préparer les données complètes pour l'API
    const nodeInfo = {
      walletAddress,
      deviceId,
      publicKey: serverPublicKey,
      ip: serverIp,
      port: 51820, // Port standard WireGuard
      lastSeen: new Date().toISOString()
    };
    
    console.log('Publication du nœud WireGuard pour le wallet:', walletAddress, 'et deviceId:', deviceId);
    console.log('Données envoyées:', JSON.stringify(nodeInfo));
    
    // Appeler l'endpoint avec les données complètes
    const response = await dhtAxios.post(`${DHT_API_BASE}/publish-wireguard`, nodeInfo);
    console.log('Réponse de la publication du nœud WireGuard:', response.data);
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
    
    // Récupérer l'ID de l'appareil
    const deviceId = getDeviceId();
    
    console.log('Stockage de valeur dans le DHT pour le wallet:', walletAddress, 'et deviceId:', deviceId);
    
    const response = await dhtAxios.post(`${DHT_API_BASE}/store`, 
      { key, value, walletAddress, deviceId },
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
    
    // Récupérer l'ID de l'appareil
    const deviceId = getDeviceId();
    
    console.log('Récupération de valeur depuis le DHT pour le wallet:', walletAddress, 'et deviceId:', deviceId);
    
    const response = await dhtAxios.get(`${DHT_API_BASE}/retrieve`, {
      params: { key, walletAddress, deviceId },
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
    // Récupérer l'adresse du wallet et le token
    const walletAddress = localStorage.getItem('walletAddress');
    const token = localStorage.getItem('token');
    
    // Récupérer l'ID de l'appareil
    const deviceId = getDeviceId();
    
    console.log(`Vérification de la connexion au backend: ${API_BASE}/status avec deviceId: ${deviceId}`);
    const response = await dhtAxios.get(`${API_BASE}/status`, {
      timeout: 10000, // 10 secondes
      headers: {
        'X-Wallet-Address': walletAddress || '',
        'Authorization': `Bearer ${token || ''}`
      },
      params: {
        walletAddress: walletAddress || '',
        deviceId: deviceId
      }
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

// Fonction utilitaire pour obtenir ou générer un ID d'appareil unique
const getDeviceId = () => {
  const storageKey = 'wind-device-id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    // Générer un ID unique pour cet appareil
    deviceId = `device-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
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
