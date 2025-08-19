import express from 'express';
import { exec } from 'child_process';
import WireGuardConfig from '../models/WireGuardConfig.js';
import * as wireguardUtils from '../utils/wireguardUtils.js';

const router = express.Router();

// Middleware pour vérifier l'authentification par wallet
const checkWalletAuth = (req, res, next) => {
  // Récupérer l'adresse du wallet depuis différentes sources
  let walletAddress = req.headers['x-wallet-address'] || req.body.walletAddress || req.body.clientWalletAddress;
  
  // Vérifier si l'authentification est fournie via l'en-tête Authorization Bearer
  const authHeader = req.headers['authorization'];
  if (!walletAddress && authHeader && authHeader.startsWith('Bearer ')) {
    walletAddress = authHeader.substring(7); // Enlever 'Bearer ' pour obtenir le token
  }

  if (!walletAddress) {
    return res.status(401).json({
      success: false,
      message: 'Adresse de wallet non fournie'
    });
  }

  // Stocker l'adresse du wallet pour l'utiliser dans les routes
  req.walletAddress = walletAddress;
  next();
};

// Endpoint pour vérifier l'état du serveur
router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Endpoint pour vérifier le statut du nœud
router.get('/status', checkWalletAuth, async (req, res) => {
  try {
    const isActive = await wireguardUtils.isWireGuardActive();
    const stats = await wireguardUtils.getWireGuardStats();
    
    // Récupérer la configuration du client s'il existe
    const clientConfig = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });
    
    res.json({
      success: true,
      active: isActive,
      status: isActive ? 'ACTIVE' : 'INACTIVE',
      clientIP: clientConfig ? clientConfig.ip : null,
      connectedUsers: stats.peers ? stats.peers.length : 0,
      performance: {
        bandwidth: 100, // Simulé en Mbps
        latency: 20, // Simulé en ms
        packetLoss: 0.1 // Simulé en %
      },
      stats: {
        uptime: 3600, // Simulé en secondes
        earnings: 0 // Simulé
      },
      nodeType: clientConfig ? 'USER' : 'GUEST',
      connectedClients: stats.peers || []
    });
  } catch (error) {
    console.error(`❌ Erreur WireGuard: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer le statut du nœud VPN'
    });
  }
});

// Endpoint pour démarrer le nœud
router.post('/connect', checkWalletAuth, async (req, res) => {
  try {
    const { isHost = false } = req.body;
    
    // Vérifier si la configuration WireGuard initiale existe
    await wireguardUtils.createInitialWireGuardConfig();
    
    // Démarrer WireGuard
    await wireguardUtils.startWireGuard();
    
    // Configurer le forwarding IP et le NAT
    await wireguardUtils.configureIPForwardingAndNAT();
    
    res.json({
      success: true,
      message: 'Nœud VPN démarré',
      ip: req.ip,
      bandwidth: 100, // Simulé en Mbps
      nodeType: isHost ? 'HOST' : 'USER'
    });
  } catch (error) {
    console.error(`❌ Erreur WireGuard: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de démarrer le nœud VPN'
    });
  }
});

// Endpoint pour arrêter le nœud
router.post('/disconnect', checkWalletAuth, async (req, res) => {
  try {
    await wireguardUtils.stopWireGuard();
    
    res.json({
      success: true,
      message: 'Nœud VPN arrêté'
    });
  } catch (error) {
    console.error(`❌ Erreur WireGuard: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible d\'arrêter le nœud VPN'
    });
  }
});

// Endpoint pour récupérer les nœuds disponibles
router.get('/available-nodes', checkWalletAuth, async (req, res) => {
  try {
    // Vérifier si le nœud est actif
    const isActive = await wireguardUtils.isWireGuardActive();
    
    if (!isActive) {
      return res.json({
        success: true,
        nodes: []
      });
    }
    
    // Pour l'instant, nous n'avons qu'un seul nœud (le serveur lui-même)
    const now = new Date();
    const serverPublicKey = await wireguardUtils.getServerPublicKey();
    
    const nodes = [
      {
        walletAddress: 'server',
        ip: '142.93.44.17', // Remplacez par votre IP publique
        country: 'France',
        region: 'Île-de-France',
        coordinates: [48.8566, 2.3522],
        bandwidth: 100,
        latency: 20,
        lastSeen: now.toISOString(),
        nodeType: 'HOST',
        status: 'ACTIVE',
        publicKey: serverPublicKey
      }
    ];
    
    res.json({
      success: true,
      nodes: nodes
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer les nœuds disponibles'
    });
  }
});

// Endpoint pour se connecter à un nœud spécifique
router.post('/connect-to-node', checkWalletAuth, async (req, res) => {
  try {
    const { hostWalletAddress } = req.body;
    const clientWalletAddress = req.walletAddress;

    if (!hostWalletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse du nœud hôte non fournie'
      });
    }
    
    // Vérifier si le client a déjà une configuration
    let clientConfig = await WireGuardConfig.findOne({ walletAddress: clientWalletAddress });
    
    if (clientConfig) {
      // Le client a déjà une configuration, l'utiliser
      const serverPublicKey = await wireguardUtils.getServerPublicKey();
      const clientWgConfig = wireguardUtils.generateClientConfig(
        serverPublicKey,
        clientConfig.privateKey,
        clientConfig.ip
      );
      
      return res.json({
        success: true,
        message: 'Configuration VPN existante récupérée',
        config: clientWgConfig,
        nodeIp: '142.93.44.17' // Remplacez par votre IP publique
      });
    }
    
    // Générer une nouvelle paire de clés pour le client
    const { privateKey, publicKey } = await wireguardUtils.generateKeyPair();
    
    // Attribuer une adresse IP au client
    const clientIP = await wireguardUtils.assignAvailableIP();
    
    // Ajouter le client à la configuration WireGuard
    await wireguardUtils.addClientToWireGuard(clientWalletAddress, publicKey, clientIP);
    
    // Sauvegarder la configuration dans MongoDB
    clientConfig = new WireGuardConfig({
      walletAddress: clientWalletAddress,
      publicKey: publicKey,
      privateKey: privateKey,
      ip: clientIP,
      isActive: true,
      lastConnected: new Date()
    });
    await clientConfig.save();
    
    // Générer la configuration client
    const serverPublicKey = await wireguardUtils.getServerPublicKey();
    const clientWgConfig = wireguardUtils.generateClientConfig(
      serverPublicKey,
      privateKey,
      clientIP
    );
    
    res.json({
      success: true,
      message: 'Configuration VPN générée avec succès',
      config: clientWgConfig,
      nodeIp: '142.93.44.17' // Remplacez par votre IP publique
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de se connecter au nœud'
    });
  }
});

// Endpoint pour se déconnecter d'un nœud
router.post('/client-disconnect', checkWalletAuth, async (req, res) => {
  try {
    const clientWalletAddress = req.walletAddress;
    
    // Récupérer la configuration du client
    const clientConfig = await WireGuardConfig.findOne({ walletAddress: clientWalletAddress });
    
    if (!clientConfig) {
      return res.status(404).json({
        success: false,
        message: 'Configuration client non trouvée'
      });
    }
    
    // Mettre à jour le statut du client
    clientConfig.isActive = false;
    await clientConfig.save();
    
    // Note: Nous ne supprimons pas réellement le client de la configuration WireGuard
    // pour éviter de redémarrer constamment le service. La configuration reste,
    // mais le client est marqué comme inactif dans la base de données.
    
    res.json({
      success: true,
      message: 'Déconnexion du nœud réussie'
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de se déconnecter du nœud'
    });
  }
});

// Endpoint pour récupérer les clients connectés
router.get('/connected-clients', checkWalletAuth, async (req, res) => {
  try {
    const stats = await wireguardUtils.getWireGuardStats();
    const clients = await WireGuardConfig.find({ isActive: true }, '-privateKey');
    
    // Enrichir les données des clients avec les statistiques WireGuard
    const enrichedClients = clients.map(client => {
      const peerStats = stats.peers.find(peer => peer.publicKey === client.publicKey) || {};
      
      return {
        walletAddress: client.walletAddress,
        ip: client.ip,
        lastConnected: client.lastConnected,
        transferRx: peerStats.transferRx || 0,
        transferTx: peerStats.transferTx || 0,
        latestHandshake: peerStats.latestHandshake || 0
      };
    });
    
    res.json({
      success: true,
      clients: enrichedClients
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer les clients connectés'
    });
  }
});

// Endpoint pour les statistiques du réseau
router.get('/network-stats', checkWalletAuth, async (req, res) => {
  try {
    // Simuler des statistiques de réseau
    res.json({
      success: true,
      stats: {
        totalNodes: 1,
        activeNodes: 1,
        totalBandwidth: 100, // Mbps
        totalUsers: await WireGuardConfig.countDocuments(),
        averageLatency: 20, // ms
        uptime: 99.9, // pourcentage
        earnings: {
          total: 0,
          daily: 0
        }
      }
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer les statistiques du réseau'
    });
  }
});

// Endpoint pour les réclamations quotidiennes
router.get('/dailyClaims', checkWalletAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      claims: {
        available: 0,
        claimed: 0,
        nextClaimTime: new Date(Date.now() + 86400000).toISOString() // 24h à partir de maintenant
      }
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer les informations de réclamation'
    });
  }
});

export default router;
