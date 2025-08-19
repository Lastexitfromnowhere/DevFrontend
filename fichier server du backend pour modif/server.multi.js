import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { exec } from 'child_process';
import jwt from 'jsonwebtoken';
import vpnRoutes from './routes/vpn.js';
import WireGuardConfig from './models/WireGuardConfig.js';
import * as wireguardUtils from './utils/wireguardUtils.js';
// Importer la nouvelle implémentation multi-nœuds
import * as dhtUtils from './utils/dhtUtils.multi.js';
// Importer les nouvelles routes multi-nœuds
import dhtRoutes from './routes/dht.multi.mjs';
import { authenticateToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import rewardsRoutes from './routes/rewards.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Configuration CORS pour autoriser les requêtes depuis le frontend
const corsOptions = {
  origin: ['https://wind-frontend-rosy.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Ajout des routes d'authentification
app.use('/auth', authRoutes);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));

const redis = new Redis(process.env.REDIS_URI);
redis.on('connect', () => console.log('✅ Redis connecté'));
redis.on('error', (err) => console.error('❌ Erreur Redis :', err));

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

// Route de base pour la santé de l'API
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ajout d'un endpoint /api/connect qui redirige vers /connect
app.post('/api/connect', checkWalletAuth, async (req, res) => {
  try {
    console.log(`🔄 Redirection de /api/connect vers /connect pour ${req.walletAddress}`);

    // Logique pour connecter l'utilisateur au VPN
    const { nodeInfo, isHost } = req.body;

    // Vérifier si l'utilisateur a déjà une configuration
    let config = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });

    if (!config) {
      // Créer une nouvelle configuration
      const keys = await wireguardUtils.generateKeyPair();
      const assignedIp = await wireguardUtils.getNextAvailableIp();

      config = new WireGuardConfig({
        walletAddress: req.walletAddress,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        assignedIp: assignedIp,
        isConnected: true,
        nodeId: 'node1',
        connectedSince: new Date(),
        bandwidth: { download: 0, upload: 0 },
        isHost: isHost || false,
        nodeInfo: nodeInfo || null
      });

      await config.save();
    } else {
      // Mettre à jour la configuration existante
      config.isConnected = true;
      config.connectedSince = new Date();
      config.isHost = isHost || config.isHost || false;
      if (nodeInfo) config.nodeInfo = nodeInfo;
      await config.save();
    }

    // Démarrer le nœud WireGuard si l'utilisateur est un hébergeur
    if (isHost) {
      console.log(`🔄 L'utilisateur est un hébergeur, démarrage du nœud WireGuard...`);

      // Exécuter la commande wg-quick up wg0
      try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
          exec('wg-quick up wg0', (error, stdout, stderr) => {
            if (error) {
              console.error(`❌ Erreur WireGuard: ${stderr}`);
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });

        console.log(`✅ Nœud WireGuard démarré avec succès`);
        console.log(`📝 Sortie: ${stdout}`);
      } catch (error) {
        console.error(`❌ Erreur lors du démarrage du nœud WireGuard: ${error.message}`);
        // On continue malgré l'erreur, car on veut quand même renvoyer une réponse
      }
    }

    console.log(`✅ Utilisateur connecté avec succès au VPN`);

    res.json({
      success: true,
      message: 'Connecté au VPN avec succès',
      ip: config.assignedIp,
      bandwidth: 100, // Valeur fictive pour l'instant
      nodeType: isHost ? 'HOST' : 'USER',
      status: 'ACTIVE'
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de se connecter au VPN'
    });
  }
});

// Intégration des routes VPN
app.use('/api', vpnRoutes);

// Intégration des routes DHT
app.use('/dht', dhtRoutes);

// Intégration des routes de récompenses
app.use('/', rewardsRoutes);

app.get('/network-stats', checkWalletAuth, async (req, res) => {
  try {
    // Simuler des statistiques de réseau
    res.json({
      success: true,
      stats: {
        totalNodes: 1,
        activeNodes: 1,
        totalBandwidth: 100, // Mbps
        totalUsers: 10, // À remplacer par une requête réelle
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

app.get('/available-nodes', checkWalletAuth, async (req, res) => {
  try {
    exec('wg show', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erreur WireGuard: ${stderr}`);
        return res.status(500).json({
          success: false,
          message: 'Impossible de récupérer la liste des nœuds VPN'
        });
      }

      // Analyser la sortie de wg show pour obtenir la liste des nœuds
      const lines = stdout.split('\n');
      const nodes = [];

      // Exemple de traitement simplifié
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('peer:')) {
          const publicKey = line.split(':')[1].trim();
          nodes.push({
            id: `node-${nodes.length + 1}`,
            publicKey,
            ip: '10.0.0.' + (nodes.length + 2),
            status: 'ACTIVE',
            bandwidth: 100,
            latency: 20
          });
        }
      }

      res.json({
        success: true,
        nodes: nodes.length > 0 ? nodes : [
          {
            id: 'node1',
            publicKey: 'default-public-key',
            ip: '10.0.0.2',
            status: 'ACTIVE',
            bandwidth: 100,
            latency: 20
          }
        ]
      });
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer la liste des nœuds VPN'
    });
  }
});

app.post('/connect', checkWalletAuth, async (req, res) => {
  try {
    // Logique pour connecter l'utilisateur au VPN
    const { nodeInfo, isHost } = req.body;

    // Vérifier si l'utilisateur a déjà une configuration
    let config = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });

    if (!config) {
      // Créer une nouvelle configuration
      const keys = await wireguardUtils.generateKeyPair();
      const assignedIp = await wireguardUtils.getNextAvailableIp();

      config = new WireGuardConfig({
        walletAddress: req.walletAddress,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        assignedIp: assignedIp,
        isConnected: true,
        nodeId: 'node1',
        connectedSince: new Date(),
        bandwidth: { download: 0, upload: 0 },
        isHost: isHost || false,
        nodeInfo: nodeInfo || null
      });

      await config.save();
    } else {
      // Mettre à jour la configuration existante
      config.isConnected = true;
      config.connectedSince = new Date();
      config.isHost = isHost || config.isHost || false;
      if (nodeInfo) config.nodeInfo = nodeInfo;
      await config.save();
    }

    // Démarrer le nœud WireGuard si l'utilisateur est un hébergeur
    if (isHost) {
      console.log(`🔄 L'utilisateur est un hébergeur, démarrage du nœud WireGuard...`);

      // Exécuter la commande wg-quick up wg0
      try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
          exec('wg-quick up wg0', (error, stdout, stderr) => {
            if (error) {
              console.error(`❌ Erreur WireGuard: ${stderr}`);
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });

        console.log(`✅ Nœud WireGuard démarré avec succès`);
        console.log(`📝 Sortie: ${stdout}`);
      } catch (error) {
        console.error(`❌ Erreur lors du démarrage du nœud WireGuard: ${error.message}`);
        // On continue malgré l'erreur, car on veut quand même renvoyer une réponse
      }
    }

    console.log(`✅ Utilisateur connecté avec succès au VPN`);

    res.json({
      success: true,
      message: 'Connecté au VPN avec succès',
      ip: config.assignedIp,
      bandwidth: 100, // Valeur fictive pour l'instant
      nodeType: isHost ? 'HOST' : 'USER',
      status: 'ACTIVE'
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de se connecter au VPN'
    });
  }
});

app.get('/config', checkWalletAuth, async (req, res) => {
  try {
    // Récupérer la configuration WireGuard de l'utilisateur
    const config = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration non trouvée'
      });
    }

    // Générer la configuration WireGuard
    const wireguardConfig = await wireguardUtils.generateWireGuardConfig(config);

    res.json({
      success: true,
      config: wireguardConfig
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer la configuration'
    });
  }
});

app.post('/disconnect', checkWalletAuth, async (req, res) => {
  try {
    // Vérifier si l'utilisateur a une configuration
    const config = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration non trouvée'
      });
    }

    // Mettre à jour la configuration
    config.isConnected = false;
    await config.save();

    // Si l'utilisateur est un hébergeur, arrêter le nœud WireGuard
    if (config.isHost) {
      console.log(`🔄 L'utilisateur est un hébergeur, arrêt du nœud WireGuard...`);

      // Exécuter la commande wg-quick down wg0
      try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
          exec('wg-quick down wg0', (error, stdout, stderr) => {
            if (error) {
              console.error(`❌ Erreur WireGuard: ${stderr}`);
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });

        console.log(`✅ Nœud WireGuard arrêté avec succès`);
        console.log(`📝 Sortie: ${stdout}`);
      } catch (error) {
        console.error(`❌ Erreur lors de l'arrêt du nœud WireGuard: ${error.message}`);
        // On continue malgré l'erreur, car on veut quand même renvoyer une réponse
      }
    }

    console.log(`✅ Utilisateur déconnecté avec succès du VPN`);

    res.json({
      success: true,
      message: 'Déconnecté du VPN avec succès'
    });
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de se déconnecter du VPN'
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
});
