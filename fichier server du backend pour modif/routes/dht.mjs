// routes/dht.mjs
import express from 'express';
import { authenticateToken } from '../middleware/auth.mjs';
import {
  startDHTNode,
  stopDHTNode,
  getDHTStatus,
  storeDHTValue,
  retrieveDHTValue,
  publishWireGuardNode,
  getWireGuardNodes
} from '../utils/dhtUtils.js';
import { getWireGuardConfig } from '../utils/wireguardUtils.js';

const router = express.Router();

// Nous n'appliquons plus l'authentication à toutes les routes
// router.use(authenticateToken); // Cette ligne est supprimée ou commentée

// Démarrer le nœud DHT - Authentification requise
router.post('/start', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    // Stocker l'adresse du wallet qui démarre le nœud dans une variable globale
    global.nodeWalletAddress = walletAddress;
    console.log(`Nœud DHT démarré par le wallet: ${walletAddress}`);
    
    // Passer l'adresse du wallet via options
    const result = await startDHTNode({ walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('? Erreur lors du démarrage du nœud DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage du nœud DHT',
      error: error.message
    });
  }
});

// Route pour récupérer les vrais noeuds WireGuard du DHT
router.get('/wireguard-nodes', async (req, res) => {
  try {
    const { walletAddress } = req.query;
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'walletAddress manquant' });
    }
    const result = await getWireGuardNodes({ walletAddress });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur wireguard-nodes', error: error.message });
  }
});

// --- Redis Cloud ---
import { getIoRedisClient } from '../config/redis.js';
const redis = getIoRedisClient();
// --- Fin Redis Cloud ---

// Route pour récupérer la liste des nœuds DHT actifs (vivants) depuis Redis
router.get('/active-nodes', async (req, res) => {
  try {
    const now = Date.now();
    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
    // Récupérer tous les nodes depuis Redis
    const allNodesObj = await redis.hgetall('dht:nodes');
    const allNodes = Object.values(allNodesObj).map(json => {
      try { return JSON.parse(json); } catch { return null; }
    }).filter(Boolean);
    // Filtrer les nœuds vus récemment
    const activeNodes = allNodes.filter(node => {
      if (!node.lastSeen) return false;
      return (now - node.lastSeen) < TIMEOUT_MS;
    });
    return res.json({ success: true, nodes: activeNodes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur récupération active-nodes', error: error.message });
  }
});
  try {
    const { walletAddress } = req.query;
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'walletAddress manquant' });
    }
    const result = await getWireGuardNodes({ walletAddress });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur lors du ping du node', error: error.message });
  }
});

// Arrêter le nœud DHT - Authentification requise
router.post('/stop', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    // Vérifier que le wallet qui arrête le nœud est le même que celui qui l'a démarré
    if (global.nodeWalletAddress && global.nodeWalletAddress !== walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à arrêter ce nœud DHT'
      });
    }
    
    // Passer l'adresse du wallet via options
    const result = await stopDHTNode({ walletAddress });
    
    // Si l'arrêt a réussi, effacer la variable globale
    if (result.success) {
      global.nodeWalletAddress = null;
      console.log(`Nœud DHT arrêté par le wallet: ${walletAddress}`);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('? Erreur lors de l\'arrêt du nœud DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'arrêt du nœud DHT',
      error: error.message
    });
  }
});

// Obtenir le statut du nœud DHT - Authentification requise
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    // Si aucune adresse de wallet n'est fournie, renvoyer un statut inactif
    if (!walletAddress) {
      return res.json({
        success: true,
        isActive: false,
        message: 'Aucun nœud DHT actif pour ce wallet'
      });
    }
    
    // Passer l'adresse du wallet via options
    const status = await getDHTStatus({ walletAddress });
    
    // Vérification supplémentaire: si le nœud est actif, vérifier que le wallet correspond
    if (status.isActive && global.nodeWalletAddress && global.nodeWalletAddress !== walletAddress) {
      // Si le wallet ne correspond pas, renvoyer un statut inactif
      return res.json({
        success: true,
        isActive: false,
        message: 'Aucun nœud DHT actif pour ce wallet'
      });
    }
    
    return res.json(status);
  } catch (error) {
    console.error('? Erreur lors de la récupération du statut du nœud DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut du nœud DHT',
      error: error.message
    });
  }
});

// Nouvelle route : Obtenir le statut du nœud DHT pour un wallet spécifique
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
    
    const status = await getDHTStatus({ walletAddress: requestedWallet });
    return res.json(status);
  } catch (error) {
    console.error('? Erreur lors de la récupération du statut du nœud DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut du nœud DHT',
      error: error.message
    });
  }
});

// Obtenir la liste des nœuds DHT - Pas d'authentification requise
router.get('/nodes', async (req, res) => {
  try {
    // Pour les routes publiques, utiliser une adresse par défaut
    // Si authentifié, récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress || 'default-wallet-address';
    
    // Passer l'adresse du wallet via options
    const status = await getDHTStatus({ walletAddress });

    if (!status.isActive) {
      return res.json({ success: true, nodes: [] });
    }

    // Dans une implémentation réelle, vous récupéreriez la liste des nœuds
    // depuis le DHT ou une base de données
    const nodes = status.stats.peers.map(peer => ({
      nodeId: peer.id,
      walletAddress: walletAddress,
      publicKey: 'clé-publique-' + peer.id.substring(0, 8),
      ip: '0.0.0.0',
      port: 9090,
      multiaddr: peer.id,
      isActive: true,
      isHost: false,
      latency: peer.latency,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }));

    // Ajouter le nœud local
    nodes.push({
      nodeId: status.nodeId,
      walletAddress: walletAddress,
      publicKey: 'clé-publique-locale',
      ip: '127.0.0.1',
      port: 9090,
      multiaddr: status.stats.addresses[0] || '',
      isActive: true,
      isHost: true,
      latency: 0,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, nodes });
  } catch (error) {
    console.error('? Erreur lors de la récupération des nœuds DHT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des nœuds',
      error: error.message
    });
  }
});

// Obtenir la liste des nœuds WireGuard - Pas d'authentification requise
router.get('/wireguard-nodes', async (req, res) => {
  try {
    // Pour les routes publiques, utiliser une adresse par défaut
    // Si authentifié, récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress || 'default-wallet-address';
    
    // Passer l'adresse du wallet via options
    const status = await getDHTStatus({ walletAddress });

    if (!status.isActive) {
      return res.json({ success: true, nodes: [] });
    }

    // Récupérer les nœuds WireGuard depuis le DHT
    const result = await getWireGuardNodes({ walletAddress });

    return res.json(result);
  } catch (error) {
    console.error('? Erreur lors de la récupération des nœuds WireGuard:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des nœuds WireGuard',
      error: error.message
    });
  }
});

// Publier un nœud WireGuard dans le DHT - Authentification requise
router.post('/wireguard-publish', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet non trouvée dans le token'
      });
    }
    
    // Récupérer la configuration WireGuard
    const wgConfig = await getWireGuardConfig(walletAddress);

    if (!wgConfig) {
      return res.status(404).json({
        success: false,
        message: 'Configuration WireGuard non trouvée'
      });
    }

    // Publier le nœud WireGuard dans le DHT
    const result = await publishWireGuardNode({
      walletAddress,
      publicKey: wgConfig.publicKey,
      ip: wgConfig.ip || '46.101.36.247',
      port: wgConfig.port || 51820
    });

    return res.json(result);
  } catch (error) {
    console.error('? Erreur lors de la publication du nœud WireGuard:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la publication du nœud WireGuard',
      error: error.message
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

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Clé ou valeur non fournie'
      });
    }

    const result = await storeDHTValue(key, value, { walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('? Erreur lors du stockage de la valeur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du stockage de la valeur',
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
    
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Clé non fournie'
      });
    }

    const result = await retrieveDHTValue(key, { walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('? Erreur lors de la récupération de la valeur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la valeur',
      error: error.message
    });
  }
});
// ➕ Suivi des pings envoyés par les daemons utilisateurs

// POST /api/dht/node/ping
// Appelé toutes les 5 minutes par les apps desktop (node-daemon)
router.post('/node/ping', async (req, res) => {
  try {
    const { wallet, peerId, uptime, version, ip } = req.body;

    if (!wallet || !peerId) {
      return res.status(400).json({ success: false, message: 'wallet et peerId sont requis' });
    }

    global.nodePings = global.nodePings || {};
    global.nodePings[peerId] = {
      wallet,
      peerId,
      uptime,
      version: version || 'unknown',
      ip: ip || req.ip,
      lastSeen: new Date().toISOString()
    };

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur ping node:', error);
    return res.status(500).json({ success: false, message: 'Erreur ping node', error: error.message });
  }
});

// GET /api/dht/node/active
// Utilisé par ton dashboard Vercel pour voir les nœuds actifs
router.get('/node/active', async (req, res) => {
  const nodes = Object.values(global.nodePings || {});
  return res.json({ success: true, nodes });
});


export default router;
