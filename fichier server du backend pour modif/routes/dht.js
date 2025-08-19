// routes/dht.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  startDHTNode,
  stopDHTNode,
  getDHTStatus,
  storeDHTValue,
  retrieveDHTValue,
  publishWireGuardNode,
  getWireGuardNodes
} from '../utils/dhtUtils.js';

const router = express.Router();

// Middleware d'authentification
router.use(authenticateToken);

// ✅ Route PING — appelée par le daemon Tauri
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
      version,
      ip,
      lastSeen: new Date().toISOString()
    };

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur ping node:', error);
    return res.status(500).json({ success: false, message: 'Erreur ping node', error: error.message });
  }
});

// ✅ Route GET - voir les nœuds actifs dans le dashboard
router.get('/node/active', (req, res) => {
  const data = global.nodePings || {};
  return res.json({ success: true, nodes: Object.values(data) });
});

// 🔁 Routes existantes (inchangées)
router.post('/start', async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) return res.status(400).json({ success: false, message: 'wallet manquant' });

    const result = await startDHTNode({ walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('Erreur start DHT:', error);
    return res.status(500).json({ success: false, message: 'Erreur start DHT', error: error.message });
  }
});

router.post('/stop', async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) return res.status(400).json({ success: false, message: 'wallet manquant' });

    const result = await stopDHTNode({ walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('Erreur stop DHT:', error);
    return res.status(500).json({ success: false, message: 'Erreur stop DHT', error: error.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) return res.status(400).json({ success: false, message: 'wallet manquant' });

    const status = await getDHTStatus({ walletAddress });
    return res.json(status);
  } catch (error) {
    console.error('Erreur statut DHT:', error);
    return res.status(500).json({ success: false, message: 'Erreur statut DHT', error: error.message });
  }
});

router.post('/store', async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const { key, value } = req.body;

    if (!walletAddress || !key || !value) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    const result = await storeDHTValue(key, value, { walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('Erreur stockage DHT:', error);
    return res.status(500).json({ success: false, message: 'Erreur stockage DHT', error: error.message });
  }
});

router.get('/retrieve/:key', async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const { key } = req.params;

    if (!walletAddress || !key) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    const result = await retrieveDHTValue(key, { walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('Erreur récupération DHT:', error);
    return res.status(500).json({ success: false, message: 'Erreur récupération DHT', error: error.message });
  }
});

router.post('/publish-node', async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const nodeInfo = req.body;

    if (!walletAddress || !nodeInfo || !nodeInfo.publicKey) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    const result = await publishWireGuardNode(nodeInfo, { walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('Erreur publication WG:', error);
    return res.status(500).json({ success: false, message: 'Erreur publication WG', error: error.message });
  }
});

router.get('/nodes', async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) return res.status(400).json({ success: false, message: 'wallet manquant' });

    const result = await getWireGuardNodes({ walletAddress });
    return res.json(result);
  } catch (error) {
    console.error('Erreur récupération WG nodes:', error);
    return res.status(500).json({ success: false, message: 'Erreur récupération WG nodes', error: error.message });
  }
});

export { router };
