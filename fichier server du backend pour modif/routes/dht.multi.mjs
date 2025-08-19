// routes/dht.multi.mjs
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  startDHTNode,
  stopDHTNode,
  getDHTStatus,
  storeDHTValue,
  retrieveDHTValue,
  publishWireGuardNode,
  getWireGuardNodes,
  getActiveDHTNodes,
  cleanupAllDHTRedisKeys
} from '../utils/dhtUtils.multi.js';
import { getWireGuardConfig } from '../utils/wireguardUtils.js';
import { getIoRedisClient } from '../config/redis.js';

const router = express.Router();
const redisClient = getIoRedisClient();

// Liste des domaines autorisés
const allowedOrigins = [
  'https://wind-frontend-rosy.vercel.app',
  'https://www.lastparadox.xyz',
  'https://lastparadox.xyz',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Fonction pour définir les en-têtes CORS appropriés
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  res.header('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin');
};

// Middleware pour gérer les requêtes OPTIONS préliminaires et définir les en-têtes CORS
router.use((req, res, next) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Démarrer le nœud DHT - Authentification requise
router.post('/start', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    // Récupérer le deviceId du corps de la requête ou utiliser une valeur par défaut
    const { deviceId = 'default-device' } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    console.log(`Tentative de démarrage du nœud DHT par le wallet: ${walletAddress}, deviceId: ${deviceId}`);
    
    // Passer l'adresse du wallet et le deviceId via options
    const result = await startDHTNode({ walletAddress, deviceId });
    
    // Invalider le cache Redis pour ce wallet et ce deviceId
    try {
      await redisClient.del(`dht:status:${walletAddress}:${deviceId}`);
      console.log(`Cache Redis invalidé pour le wallet ${walletAddress}, deviceId ${deviceId} après démarrage du nœud`);
    } catch (redisError) {
      console.error('Erreur lors de l\'invalidation du cache Redis:', redisError);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Erreur lors du démarrage du nœud DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage du nœud DHT',
      error: error.message
    });
  }
});

// Heartbeat pour garder le nœud DHT actif
router.post('/heartbeat', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const { deviceId = 'default-device' } = req.body;
    if (!walletAddress) return res.status(400).json({ success: false, message: 'Adresse de wallet manquante' });

    // Recharge le nodeState existant, prolonge le TTL
    const nodeKey = `dht:node:${walletAddress}:${deviceId}`;
    const statusKey = `dht:status:${walletAddress}:${deviceId}`;
    const nodeData = await redisClient.get(nodeKey);
    if (!nodeData) return res.status(404).json({ success: false, message: 'Nœud non trouvé' });

    await redisClient.expire(nodeKey, 300); // Prolonge le TTL
    await redisClient.expire(statusKey, 300);
    return res.json({ success: true, message: 'Heartbeat reçu' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Arrêter le nœud DHT - Authentification requise
router.post('/stop', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    // Récupérer le deviceId du corps de la requête ou utiliser une valeur par défaut
    const { deviceId = 'default-device' } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    console.log(`Tentative d'arrêt du nœud DHT par le wallet: ${walletAddress}, deviceId: ${deviceId}`);
    
    // Passer l'adresse du wallet et le deviceId via options
    const result = await stopDHTNode({ walletAddress, deviceId });
    
    // Invalider le cache Redis pour ce wallet et ce deviceId
    try {
      await redisClient.del(`dht:status:${walletAddress}:${deviceId}`);
      console.log(`Cache Redis invalidé pour le wallet ${walletAddress}, deviceId ${deviceId} après arrêt du nœud`);
    } catch (redisError) {
      console.error('Erreur lors de l\'invalidation du cache Redis:', redisError);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Erreur lors de l\'arrêt du nœud DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'arrêt du nœud DHT',
      error: error.message
    });
  }
});

// Route OPTIONS spécifique pour gérer les requêtes préliminaires CORS pour /status
router.options('/status', (req, res) => {
  const origin = req.headers.origin;
  console.log(`Requête OPTIONS /dht/status reçue - Origine: ${origin}`);
  
  // Vérifier si l'origine est autorisée et définir l'en-tête en conséquence
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`En-tête CORS OPTIONS défini pour l'origine: ${origin}`);
  } else {
    console.log(`Origine OPTIONS non autorisée: ${origin}`);
  }
  
  // Définir les autres en-têtes CORS pour la requête préliminaire
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 heures
  
  // Répondre avec un statut 200 pour la requête préliminaire
  return res.sendStatus(200);
});

// Obtenir le statut du nœud DHT - Authentification requise
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT ou depuis les paramètres de requête
    const walletAddress = req.query.walletAddress || req.user?.walletAddress;
    
    // Récupérer le deviceId des paramètres de requête ou utiliser une valeur par défaut
    const deviceId = req.query.deviceId || 'default-device';
    
    console.log(`Récupération du statut du nœud DHT pour le wallet: ${walletAddress}, deviceId: ${deviceId}`);
    console.log(`Adresse du wallet dans le token: ${req.user?.walletAddress}`);
    console.log(`Adresse du wallet dans les paramètres: ${req.query.walletAddress}`);
    
    // Si aucune adresse de wallet n'est fournie, renvoyer un statut inactif
    if (!walletAddress) {
      console.log('Aucune adresse de wallet fournie');
      return res.json({
        success: true,
        isActive: false,
        message: 'Aucun nœud DHT actif pour ce wallet'
      });
    }
    
    // Vérifier d'abord dans Redis
    try {
      const cachedStatus = await redisClient.get(`dht:status:${walletAddress}:${deviceId}`);
      if (cachedStatus) {
        console.log(`Statut DHT récupéré depuis Redis pour ${walletAddress}:${deviceId}`);
        return res.json(JSON.parse(cachedStatus));
      }
    } catch (redisError) {
      console.error('Erreur lors de la récupération du cache Redis:', redisError);
      // Continuer avec la récupération normale en cas d'erreur Redis
    }
    
    // En mode développement ou production avec debug activé, autoriser l'accès sans vérification stricte
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true') {
      console.log('Mode développement ou debug: Accès autorisé sans vérification stricte');
      // Passer l'adresse du wallet via options
      const status = await getDHTStatus({ walletAddress, deviceId });
      
      // Mettre en cache pour 30 secondes
      try {
        await redisClient.set(`dht:status:${walletAddress}:${deviceId}`, JSON.stringify(status), 'EX', 30);
      } catch (redisCacheError) {
        console.error('Erreur lors de la mise en cache Redis:', redisCacheError);
      }
      
      return res.json(status);
    }
    
    // Vérification de sécurité : seul le propriétaire peut voir son nœud
    if (req.user?.walletAddress !== walletAddress) {
      console.log(`Tentative d'accès non autorisé: ${req.user?.walletAddress} essaie d'accéder au nœud de ${walletAddress}`);
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à voir ce nœud DHT'
      });
    }
    
    // Passer l'adresse du wallet via options
    const status = await getDHTStatus({ walletAddress, deviceId });
    
    // Mettre en cache pour 30 secondes
    try {
      await redisClient.set(`dht:status:${walletAddress}:${deviceId}`, JSON.stringify(status), 'EX', 30);
    } catch (redisCacheError) {
      console.error('Erreur lors de la mise en cache Redis:', redisCacheError);
    }
    
    return res.json(status);
  } catch (error) {
    console.error('Erreur lors de la récupération du statut du nœud DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut du nœud DHT',
      error: error.message
    });
  }
});

// Obtenir le statut du nœud DHT pour un wallet spécifique - Authentification requise
router.get('/status/:walletAddress', authenticateToken, async (req, res) => {
  try {
    const requestedWallet = req.params.walletAddress;
    const userWallet = req.user?.walletAddress;
    
    // Vérification de sécurité : seul le propriétaire peut voir son nœud
    if (userWallet !== requestedWallet) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à voir ce nœud DHT'
      });
    }
    
    console.log(`Récupération du statut du nœud DHT pour le wallet spécifique: ${requestedWallet}`);
    
    // Vérifier d'abord dans Redis
    try {
      const cachedStatus = await redisClient.get(`dht:status:${requestedWallet}:default-device`);
      if (cachedStatus) {
        console.log(`Statut DHT récupéré depuis Redis pour ${requestedWallet}`);
        return res.json(JSON.parse(cachedStatus));
      }
    } catch (redisError) {
      console.error('Erreur lors de la récupération du cache Redis:', redisError);
      // Continuer avec la récupération normale en cas d'erreur Redis
    }
    
    const status = await getDHTStatus({ walletAddress: requestedWallet, deviceId: 'default-device' });
    
    // Mettre en cache pour 30 secondes
    try {
      await redisClient.set(`dht:status:${requestedWallet}:default-device`, JSON.stringify(status), 'EX', 30);
    } catch (redisCacheError) {
      console.error('Erreur lors de la mise en cache Redis:', redisCacheError);
    }
    
    return res.json(status);
  } catch (error) {
    console.error('Erreur lors de la récupération du statut du nœud DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut du nœud DHT',
      error: error.message
    });
  }
});

// Obtenir la liste des nœuds DHT actifs - Authentification requise
router.get('/nodes', authenticateToken, async (req, res) => {
  try {
    console.log('==== ENDPOINT /dht/nodes APPELÉ - VERSION SIMPLIFIÉE ====');
    
    // Vérifier d'abord dans Redis
    try {
      const cachedNodes = await redisClient.get('dht:nodes');
      if (cachedNodes) {
        console.log('Nœuds DHT récupérés depuis Redis');
        return res.json(JSON.parse(cachedNodes));
      }
    } catch (redisError) {
      console.error('Erreur lors de la récupération du cache Redis pour les nœuds DHT:', redisError);
      // Continuer avec la génération normale en cas d'erreur Redis
    }
    
    // Générer directement 5 nœuds de démonstration sans aucune condition
    const demoNodes = [];
    for (let i = 0; i < 5; i++) {
      const nodeId = `demo-node-${i}-${Math.random().toString(36).substring(2, 8)}`;
      demoNodes.push({
        nodeId: nodeId,
        walletAddress: `demo-wallet-${i}`,
        publicKey: `demo-key-${i}`,
        ip: `192.168.1.${10 + i}`,
        port: 9090,
        multiaddr: `/ip4/192.168.1.${10 + i}/tcp/9090/p2p/${nodeId}`,
        isActive: true,
        isHost: false,
        bandwidth: Math.floor(Math.random() * 1000),
        latency: Math.floor(Math.random() * 100),
        uptime: Math.floor(Math.random() * 3600),
        lastSeen: new Date().toISOString(),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
      });
    }
    
    console.log('Nœuds de démonstration générés:', demoNodes.length);
    console.log('Premier nœud:', demoNodes[0]);
    
    const response = {
      success: true,
      nodes: demoNodes
    };
    
    // Mettre en cache pour 60 secondes (les nœuds changent moins souvent que les statuts)
    try {
      await redisClient.set('dht:nodes', JSON.stringify(response), 'EX', 60);
    } catch (redisCacheError) {
      console.error('Erreur lors de la mise en cache Redis des nœuds DHT:', redisCacheError);
    }
    
    // Retourner directement les nœuds de démonstration
    return res.json(response);
  } catch (error) {
    console.error('Erreur dans l\'endpoint /dht/nodes:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des nœuds DHT',
      error: error.message
    });
  }
});

// Fonction pour générer des nœuds de démonstration
function generateDemoNodes(count) {
  const demoNodes = [];
  for (let i = 0; i < count; i++) {
    const nodeId = `demo-node-${i}-${Math.random().toString(36).substring(2, 10)}`;
    demoNodes.push({
      nodeId: nodeId,
      walletAddress: `demo-wallet-${i}`,
      publicKey: `demo-key-${i}`,
      ip: `192.168.1.${10 + i}`,
      port: 9090,
      multiaddr: `/ip4/192.168.1.${10 + i}/tcp/9090/p2p/${nodeId}`,
      isActive: true,
      isHost: false,
      bandwidth: Math.floor(Math.random() * 1000),
      latency: Math.floor(Math.random() * 100),
      uptime: Math.floor(Math.random() * 3600),
      lastSeen: new Date().toISOString(),
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
    });
  }
  return demoNodes;
}

// Obtenir la liste de tous les nœuds DHT actifs (pour le débogage) - Authentification requise
router.get('/active-nodes', authenticateToken, async (req, res) => {
  try {
    const activeNodes = await getActiveDHTNodes();
    
    return res.json({
      success: true,
      activeNodes,
      count: activeNodes.length,
      message: 'Liste des nœuds actifs récupérée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste des nœuds actifs:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la liste des nœuds actifs',
      error: error.message,
      activeNodes: []
    });
  }
});

// Stocker une valeur dans le DHT - Authentification requise
router.post('/store', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    const { key, value } = req.body;
    
    if (!key || !value) {
      return res.status(400).json({
        success: false,
        message: 'Clé et valeur requises'
      });
    }
    
    console.log(`Stockage de la valeur pour la clé: ${key} par le wallet: ${walletAddress}`);
    
    // Passer l'adresse du wallet via options
    const result = await storeDHTValue(key, value, { walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('Erreur lors du stockage de la valeur dans le DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du stockage de la valeur dans le DHT',
      error: error.message
    });
  }
});

// Récupérer une valeur depuis le DHT - Authentification requise
router.get('/retrieve/:key', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    const key = req.params.key;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Clé requise'
      });
    }
    
    console.log(`Récupération de la valeur pour la clé: ${key} par le wallet: ${walletAddress}`);
    
    // Passer l'adresse du wallet via options
    const result = await retrieveDHTValue(key, { walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération de la valeur depuis le DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la valeur depuis le DHT',
      error: error.message
    });
  }
});

// Publier un nœud WireGuard dans le DHT - Authentification requise
router.post('/publish-wireguard', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    const nodeInfo = req.body;
    
    if (!nodeInfo || !nodeInfo.publicKey) {
      return res.status(400).json({
        success: false,
        message: 'Informations du nœud WireGuard requises'
      });
    }
    
    console.log(`Publication du nœud WireGuard pour le wallet: ${walletAddress}`);
    
    // Passer l'adresse du wallet via options
    const result = await publishWireGuardNode(nodeInfo, { walletAddress });
    
    // Invalider les caches Redis pour les nœuds WireGuard et le statut DHT
    try {
      await redisClient.del(`dht:wireguard-nodes:${walletAddress}`);
      await redisClient.del(`dht:status:${walletAddress}:default-device`);
      console.log(`Cache Redis invalidé pour les nœuds WireGuard et statut DHT du wallet ${walletAddress}`);
    } catch (redisError) {
      console.error('Erreur lors de l\'invalidation du cache Redis:', redisError);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Erreur lors de la publication du nœud WireGuard:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la publication du nœud WireGuard',
      error: error.message
    });
  }
});

// Récupérer les nœuds WireGuard depuis le DHT - Authentification requise
router.get('/wireguard-nodes', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token',
        nodes: []
      });
    }
    
    console.log(`Récupération des nœuds WireGuard pour le wallet: ${walletAddress}`);
    
    // Vérifier d'abord dans Redis
    try {
      const cachedNodes = await redisClient.get(`dht:wireguard-nodes:${walletAddress}`);
      if (cachedNodes) {
        console.log(`Nœuds WireGuard récupérés depuis Redis pour ${walletAddress}`);
        return res.json(JSON.parse(cachedNodes));
      }
    } catch (redisError) {
      console.error('Erreur lors de la récupération du cache Redis pour les nœuds WireGuard:', redisError);
      // Continuer avec la récupération normale en cas d'erreur Redis
    }
    
    // Passer l'adresse du wallet via options
    const result = await getWireGuardNodes({ walletAddress });
    
    // Mettre en cache pour 60 secondes (les nœuds changent moins souvent que les statuts)
    try {
      await redisClient.set(`dht:wireguard-nodes:${walletAddress}`, JSON.stringify(result), 'EX', 60);
    } catch (redisCacheError) {
      console.error('Erreur lors de la mise en cache Redis des nœuds WireGuard:', redisCacheError);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération des nœuds WireGuard:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des nœuds WireGuard',
      error: error.message,
      nodes: []
    });
  }
});

// Obtenir la configuration WireGuard - Authentification requise
router.get('/wireguard-config', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    console.log(`Récupération de la configuration WireGuard pour le wallet: ${walletAddress}`);
    
    // Générer la configuration WireGuard
    const config = await getWireGuardConfig(walletAddress);
    
    return res.json({
      success: true,
      message: 'Configuration WireGuard récupérée avec succès',
      config
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration WireGuard:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration WireGuard',
      error: error.message
    });
  }
});

// Route de test pour vérifier les données Redis
router.get('/redis-test', async (req, res) => {
  try {
    // Récupérer toutes les clés liées aux nœuds DHT
    const keys = await redisClient.keys('dht:*');
    
    // Récupérer les valeurs pour chaque clé
    const results = {};
    for (const key of keys) {
      const value = await redisClient.get(key);
      results[key] = value;
    }
    
    res.json({
      success: true,
      message: 'Données Redis récupérées avec succès',
      keys: keys,
      data: results
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des données Redis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des données Redis',
      error: error.message
    });
  }
});

// Route pour nettoyer toutes les clés Redis liées aux nœuds DHT (protégée par authentification admin)
router.post('/cleanup-redis', authenticateToken, async (req, res) => {
  try {
    // Vérifier si l'utilisateur a les droits d'administration
    const isAdmin = req.user && req.user.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé: Droits d\'administration requis'
      });
    }
    
    console.log('Demande de nettoyage des clés Redis liées aux nœuds DHT reçue');
    
    // Appeler la fonction de nettoyage
    const result = await cleanupAllDHTRedisKeys();
    
    return res.json(result);
  } catch (error) {
    console.error('Erreur lors du nettoyage des clés Redis:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage des clés Redis',
      error: error.message
    });
  }
});
// ➕ Ping d’un nœud depuis l'app desktop (non authentifié)
router.post('/node/ping', async (req, res) => {
  try {
    const { wallet, peerId, uptime, version, ip } = req.body;

    if (!wallet || !peerId) {
      return res.status(400).json({ success: false, message: 'wallet et peerId sont requis' });
    }

    const redisKey = `dht:pings:${peerId}`;
    const nodePing = {
      wallet,
      peerId,
      uptime,
      version: version || 'unknown',
      ip: ip || req.ip,
      lastSeen: new Date().toISOString()
    };

    // Stocker dans Redis avec TTL de 10 min
    await redisClient.set(redisKey, JSON.stringify(nodePing), 'EX', 600);
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur ping node:', error);
    return res.status(500).json({ success: false, message: 'Erreur ping node', error: error.message });
  }
});

// ✅ Dashboard - voir les nœuds pingés actifs
router.get('/node/active', async (req, res) => {
  try {
    const keys = await redisClient.keys('dht:pings:*');
    const nodes = [];

    for (const key of keys) {
      const value = await redisClient.get(key);
      if (value) nodes.push(JSON.parse(value));
    }

    return res.json({ success: true, nodes });
  } catch (error) {
    console.error('❌ Erreur récupération des nœuds actifs:', error);
    return res.status(500).json({ success: false, message: 'Erreur lecture nœuds actifs', error: error.message });
  }
});


export default router;
