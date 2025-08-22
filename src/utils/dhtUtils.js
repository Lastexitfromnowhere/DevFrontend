import axios from 'axios';
import { config } from '../config/env';
import { authService } from '../services/authService';
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
const API_BASE = '/api';
const DHT_API_BASE = `${API_BASE}/dht`;
let cachedStatus = null;
let lastStatusCheck = 0;
const STATUS_CACHE_TIME = 5000; 
const getAuthHeaders = async () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await authService.refreshTokenIfNeeded()}`
    };
  }
  return await authService.getAuthHeaders();
};
const dhtAxios = axios.create({
  timeout: 30000, 
  headers: {
    'Content-Type': 'application/json'
  }
});
dhtAxios.interceptors.request.use(
  async (config) => {
    console.log(`DHT Request: ${config.method?.toUpperCase()} ${config.url}`);
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
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        authService.refreshTokenIfNeeded().catch(err => {
          console.error('Impossible de rafraîchir le token:', err);
        });
      }
    } else if (error.response?.status === 403) {
      console.warn('Erreur d\'autorisation 403: Token invalide ou expiré');
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        authService.refreshTokenIfNeeded().catch(err => {
          console.error('Impossible de rafraîchir le token:', err);
        });
      }
    }
    return Promise.reject(error);
  }
);
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
export const startDHTNode = async (walletAddressParam, deviceIdParam) => {
  try {
    const walletAddress = walletAddressParam || authService.getWalletAddressFromToken();
    const deviceId = deviceIdParam || getDeviceId();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
    console.log('Démarrage du nœud DHT pour le wallet:', walletAddress, 'sur l\'appareil:', deviceId);
    const status = await getDHTStatusByWallet(walletAddress, deviceId);
    if (status.isActive || status.active) {
      console.log('Le nœud DHT est déjà actif.');
      return { success: true, ...status };
    }
    const response = await dhtAxios.post(`${DHT_API_BASE}/start`, { 
      walletAddress,
      deviceId 
    });
    cachedStatus = null;
    let isActive = false;
    let retries = 0;
    const maxRetries = 10;
    while (!isActive && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000));
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
export const stopDHTNode = async (walletAddressParam, deviceIdParam) => {
  try {
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
export const getDHTStatus = async () => {
  const now = Date.now();
  if (cachedStatus && lastStatusCheck && (now - lastStatusCheck < 5000)) {
    return cachedStatus;
  }
  try {
    const walletAddress = authService.getWalletAddress();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
    const deviceId = getDeviceId();
    await authService.refreshTokenIfNeeded();
    const tokenWalletAddress = authService.getWalletAddressFromToken();
    if (tokenWalletAddress && tokenWalletAddress !== walletAddress) {
      console.warn(`L'adresse fournie (${walletAddress}) ne correspond pas à celle du token (${tokenWalletAddress}). Utilisation de l'adresse du token.`);
      walletAddress = tokenWalletAddress;
    }
    console.log(`Récupération du statut DHT depuis ${DHT_API_BASE}/status avec walletAddress=${walletAddress} et deviceId=${deviceId}`);
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
    return {
      success: false,
      isActive: false,
      error: error.message
    };
  }
};
export const getDHTStatusByWallet = async (walletAddress, deviceIdParam) => {
  if (!walletAddress) {
    console.error('Erreur: adresse de wallet non fournie');
    return { success: false, error: 'Adresse de wallet non fournie' };
  }
  const deviceId = deviceIdParam || getDeviceId();
  console.log('Utilisation de deviceId:', deviceId);
  try {
    await authService.refreshTokenIfNeeded();
    const tokenWalletAddress = authService.getWalletAddressFromToken();
    if (tokenWalletAddress && tokenWalletAddress !== walletAddress) {
      console.warn(`L'adresse fournie (${walletAddress}) ne correspond pas à celle du token (${tokenWalletAddress}). Régénération du token...`);
      try {
        const { token, expiresAt } = await authService.generateToken(walletAddress);
        authService.saveToken(token, expiresAt, walletAddress);
        console.log('Nouveau token généré pour le wallet:', walletAddress);
      } catch (tokenError) {
        console.error('Erreur lors de la génération du token:', tokenError);
      }
    }
    const headers = await getAuthHeaders();
    console.log('Entêtes d\'authentification:', headers);
    console.log('Adresse du wallet utilisée pour la requête:', walletAddress);
    const cacheBuster = Date.now();
    const params = { 
      walletAddress,
      deviceId,  
      _cb: cacheBuster  
    };
    console.log('Starting Request:', {
      url: `${DHT_API_BASE}/status`,
      method: 'get',
      params: params,
      headers: headers
    });
    const response = await dhtAxios.get(`${DHT_API_BASE}/status`, { 
      headers,
      params: params
    });
    console.log('Réponse du serveur:', response.status, response.data);
    if (response.data && (response.data.isActive === false || response.data.active === false)) {
      console.log('Le serveur indique que le nœud est inactif, tentative de vérification directe...');
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const { token, expiresAt } = await authService.generateToken(walletAddress);
        authService.saveToken(token, expiresAt, walletAddress);
        const freshHeaders = await getAuthHeaders();
        const retryResponse = await dhtAxios.get(`${DHT_API_BASE}/status`, { 
          headers: freshHeaders,
          params: { 
            walletAddress,
            deviceId,  
            _cb: Date.now()  
          }
        });
        console.log('Réponse de la seconde tentative:', retryResponse.status, retryResponse.data);
        return retryResponse.data;
      } catch (retryError) {
        console.error('Erreur lors de la seconde tentative:', retryError);
      }
    }
    if (response.data && response.data.isActive === true) {
      response.data.active = true;
    }
    console.log('Statut DHT final retourné au frontend:', {
      walletAddress,
      deviceId,
      isActive: response.data?.isActive,
      active: response.data?.active,
      nodeId: response.data?.nodeId
    });
    if (response.data) {
      if (response.data.active === true && response.data.isActive !== true) {
        console.log('Correction: active est true mais isActive ne l\'est pas, définition de isActive à true');
        response.data.isActive = true;
      }
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
    if (error.response && error.response.status === 403) {
      console.log('Génération d\'un statut de nœud inactif suite à une erreur 403');
      return { 
        success: false, 
        isActive: false,
        message: 'Non autorisé à voir ce nœud DHT' 
      };
    }
    return { success: false, error: error.message };
  }
};
export const getDHTNodes = async (useDemoNodes = true) => {
  return [];
};
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
export const getWireGuardNodes = async () => {
  try {
    await authService.refreshTokenIfNeeded();
    const walletAddress = authService.getWalletAddressFromToken();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible dans le token JWT');
    }
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
    if (response.data.success && Array.isArray(response.data.nodes)) {
      console.log(`${response.data.nodes.length} nœuds WireGuard récupérés depuis l'API`);
      response.data.nodes = response.data.nodes.map(node => {
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
export const publishWireGuardNode = async (walletAddress) => {
  try {
    const deviceId = getDeviceId();
    const serverPublicKey = localStorage.getItem('wireguard_server_public_key') || '';
    const serverIp = localStorage.getItem('wireguard_server_ip') || '46.101.36.247'; 
    const nodeInfo = {
      walletAddress,
      deviceId,
      publicKey: serverPublicKey,
      ip: serverIp,
      port: 51820, 
      lastSeen: new Date().toISOString()
    };
    console.log('Publication du nœud WireGuard pour le wallet:', walletAddress, 'et deviceId:', deviceId);
    console.log('Données envoyées:', JSON.stringify(nodeInfo));
    const response = await dhtAxios.post(`${DHT_API_BASE}/publish-wireguard`, nodeInfo);
    console.log('Réponse de la publication du nœud WireGuard:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la publication du nœud WireGuard:', error);
    return { success: false, error: error.message };
  }
};
export const storeDHTValue = async (key, value) => {
  try {
    const walletAddress = authService.getWalletAddress();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
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
export const retrieveDHTValue = async (key) => {
  try {
    const walletAddress = authService.getWalletAddress();
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
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
export const checkBackendConnection = async () => {
  try {
    const walletAddress = localStorage.getItem('walletAddress');
    const token = localStorage.getItem('token');
    const deviceId = getDeviceId();
    console.log(`Vérification de la connexion au backend: ${API_BASE}/status avec deviceId: ${deviceId}`);
    const response = await dhtAxios.get(`${API_BASE}/status`, {
      timeout: 10000, 
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
    console.log('Test de connectivité DHT: Vérification de l\'authentification...');
    try {
      await authService.refreshTokenIfNeeded();
      const walletAddress = authService.getWalletAddressFromToken();
      if (!walletAddress) {
        throw new Error('Adresse de wallet non disponible dans le token JWT');
      }
      const headers = await getAuthHeaders();
      results.details.authHeaders = { ...headers };
      if (results.details.authHeaders.Authorization) {
        results.details.authHeaders.Authorization = 'Bearer [MASKED]';
      }
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
    console.log('Test de connectivité DHT: Vérification de l\'activité du nœud...');
    try {
      const statusResponse = await getDHTStatus();
      results.details.localNodeStatus = statusResponse;
      const isLocallyActive = statusResponse.success && statusResponse.isActive;
      console.log('Nœud actif localement:', isLocallyActive, statusResponse);
      const walletAddress = authService.getWalletAddressFromToken();
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
      const nodesResponse = await getDHTNodes();
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
const getDeviceId = () => {
  const storageKey = 'wind-device-id';
  let deviceId = localStorage.getItem(storageKey);
  if (!deviceId) {
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
