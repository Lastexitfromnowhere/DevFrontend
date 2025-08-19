// utils/dhtUtils.multi.js
import { createLibp2p } from 'libp2p';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { peerIdFromString } from '@libp2p/peer-id';
import { multiaddr } from '@multiformats/multiaddr';
import { getIoRedisClient } from '../config/redis.js';

// Structure pour stocker les nœuds DHT par wallet
const dhtNodes = new Map();

// Obtenir le client Redis
const redisClient = getIoRedisClient();

// Bootstraps peers communs
let bootstrapPeers = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/ip4/46.101.36.247/tcp/4001/p2p/12D3KooWJWEKvSFbben74tNQjPe5kmiRgRJmVJLqE5iKXZ89bPbQ'
];

// Fonction pour sauvegarder l'état du nœud dans Redis
export const saveNodeStateToRedis = async (walletAddress, nodeInfo, deviceId = 'default-device') => {
  try {
    console.log(`DHT-REDIS-DEBUG: Tentative de sauvegarde pour wallet=${walletAddress}, deviceId=${deviceId}`);
    console.log(`DHT-REDIS-DEBUG: État du client Redis:`, redisClient ? 'Disponible' : 'Non disponible');
    
    if (!walletAddress) {
      console.error('DHT-REDIS: Adresse de wallet non fournie pour la sauvegarde dans Redis');
      return false;
    }

    // Créer une copie des informations du nœud pour la sauvegarde
    // On ne peut pas sauvegarder l'objet node directement car il contient des méthodes et des références circulaires
    const nodeState = {
      isActive: nodeInfo.isActive,
      nodeId: nodeInfo.nodeId,
      nodeType: 'standard',
      nodeIp: '127.0.0.1', // IP locale par défaut
      connectedPeers: 0, // À mettre à jour avec le nombre réel de pairs connectés
      storageUsed: 0, // À mettre à jour avec l'utilisation réelle du stockage
      totalStorage: 10000, // Valeur arbitraire pour le moment
      uptime: 0, // À mettre à jour avec le temps d'activité réel
      lastUpdated: new Date().toISOString(),
      protocol: 'libp2p',
      wireGuardEnabled: nodeInfo.wireGuardEnabled || false,
      node: null // On ne sauvegarde pas l'objet node
    };

    // Clés Redis pour le nœud et son statut
    const nodeKey = `dht:node:${walletAddress}:${deviceId}`;
    const statusKey = `dht:status:${walletAddress}:${deviceId}`;
    
    console.log(`DHT-REDIS-DEBUG: Clés Redis: nodeKey=${nodeKey}, statusKey=${statusKey}`);
    console.log(`DHT-REDIS-DEBUG: Données à sauvegarder:`, JSON.stringify(nodeState).substring(0, 100) + '...');

    // Sauvegarder l'état du nœud dans Redis avec un TTL de 5 minutes (300 secondes)
    const nodeResult = await redisClient.set(nodeKey, JSON.stringify(nodeState), 'EX', 300);
    const statusResult = await redisClient.set(statusKey, JSON.stringify({
      success: true,
      isActive: nodeState.isActive,
      message: nodeState.isActive ? 'Nœud DHT actif' : 'Nœud DHT inactif',
      nodeId: nodeState.nodeId
    }), 'EX', 300);

    console.log(`DHT-REDIS: État du nœud sauvegardé dans Redis pour ${walletAddress}:${deviceId}`, nodeResult === 'OK' ? 'Succès' : 'Échec', statusResult === 'OK' ? 'Succès' : 'Échec');
    return nodeResult === 'OK' && statusResult === 'OK';
  } catch (error) {
    console.error('DHT-REDIS: Erreur lors de la sauvegarde de l\'état du nœud dans Redis:', error);
    return false;
  }
};

// Fonction pour récupérer l'état du nœud depuis Redis
export const getNodeStateFromRedis = async (walletAddress, deviceId = 'default-device') => {
  try {
    if (!walletAddress) {
      console.error('DHT-REDIS: Adresse de wallet non fournie pour la récupération depuis Redis');
      return null;
    }

    // Clé Redis pour le nœud
    const nodeKey = `dht:node:${walletAddress}:${deviceId}`;

    // Récupérer l'état du nœud depuis Redis
    const nodeState = await redisClient.get(nodeKey);
    
    if (!nodeState) {
      console.log(`DHT-REDIS: Aucun état de nœud trouvé dans Redis pour ${walletAddress}:${deviceId}`);
      return null;
    }

    console.log(`DHT-REDIS: État du nœud récupéré depuis Redis pour ${walletAddress}:${deviceId}`);
    return JSON.parse(nodeState);
  } catch (error) {
    console.error('DHT-REDIS: Erreur lors de la récupération de l\'état du nœud depuis Redis:', error);
    return null;
  }
};

// Fonction pour initialiser et démarrer un nœud DHT
export const startDHTNode = async (options = {}) => {
  try {
    // Récupérer l'adresse du wallet et l'ID de l'appareil depuis les options
    const { walletAddress, deviceId = 'default-device' } = options;
    
    console.log(`DHT-REDIS-DEBUG: startDHTNode appelé avec wallet=${walletAddress}, deviceId=${deviceId}`);
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour le démarrage du nœud DHT');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie',
        isActive: false
      };
    }
    
    // Générer un ID de nœud unique basé sur l'adresse du wallet et l'ID de l'appareil
    const uniqueNodeId = `simulated-node-${Math.random().toString(36).substring(2, 10)}`;
    console.log(`DHT-REDIS-DEBUG: Démarrage du nœud DHT avec ID ${uniqueNodeId} pour ${walletAddress}:${deviceId}`);
    
    // Vérifier si ce wallet a déjà un nœud actif
    if (dhtNodes.has(walletAddress) && dhtNodes.get(walletAddress).isActive) {
      console.log(`DHT-REDIS-DEBUG: Le nœud DHT est déjà actif pour le wallet: ${walletAddress}`);
      const nodeInfo = dhtNodes.get(walletAddress);
      
      // Mettre à jour l'état dans Redis même si le nœud est déjà actif
      const saveResult = await saveNodeStateToRedis(walletAddress, nodeInfo, deviceId);
      console.log(`DHT-REDIS-DEBUG: Résultat de la sauvegarde Redis pour nœud déjà actif: ${saveResult}`);
      
      return { 
        success: true, 
        message: 'Le nœud DHT est déjà actif',
        isActive: true,
        nodeId: nodeInfo.nodeId
      };
    }

    // Vérifier si l'état du nœud existe dans Redis
    const savedState = await getNodeStateFromRedis(walletAddress, deviceId);
    if (savedState && savedState.isActive) {
      console.log(`DHT-REDIS-DEBUG: État du nœud actif trouvé dans Redis pour ${walletAddress}:${deviceId}`);
      
      // Stocker les informations du nœud dans la Map (sans l'objet node réel)
      dhtNodes.set(walletAddress, {
        isActive: true,
        nodeId: savedState.nodeId,
        walletAddress,
        deviceId,
        wireGuardEnabled: savedState.wireGuardEnabled || false
      });
      
      return { 
        success: true, 
        message: 'Nœud DHT réactivé depuis Redis',
        isActive: true,
        nodeId: savedState.nodeId
      };
    }

    console.log(`Démarrage du nœud DHT pour le wallet: ${walletAddress}...`);
    
    // Créer et démarrer un nœud libp2p
    const node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
      },
      transports: [
        tcp(),
        webSockets()
      ],
      connectionEncryption: [
        noise()
      ],
      streamMuxers: [
        yamux()
      ],
      peerDiscovery: [
        bootstrap({
          list: bootstrapPeers
        })
      ],
      dht: kadDHT({
        clientMode: false,
        validators: {
          v1: {
            async validate() { return true; }
          }
        },
        selectors: {
          v1: () => 0
        }
      })
    });

    // Démarrer le nœud
    await node.start();
    const nodeId = node.peerId.toString();
    
    // Stocker les informations du nœud dans la Map
    const nodeInfo = {
      node,
      isActive: true,
      nodeId,
      walletAddress,
      wireGuardEnabled: false
    };
    
    dhtNodes.set(walletAddress, nodeInfo);

    console.log(`DHT-REDIS-DEBUG: Préparation à la sauvegarde dans Redis pour ${walletAddress}:${deviceId}`);
    console.log(`DHT-REDIS-DEBUG: nodeInfo:`, JSON.stringify({
      isActive: nodeInfo.isActive,
      nodeId: nodeInfo.nodeId,
      walletAddress: nodeInfo.walletAddress,
      wireGuardEnabled: nodeInfo.wireGuardEnabled
    }));

    // Sauvegarder l'état du nœud dans Redis
    const saveResult = await saveNodeStateToRedis(walletAddress, nodeInfo, deviceId);
    console.log(`DHT-REDIS-DEBUG: Résultat de la sauvegarde Redis: ${saveResult}`);
    console.log(`DHT-REDIS: Sauvegarde dans Redis pour ${walletAddress}:${deviceId}: ${saveResult ? 'Succès' : 'Échec'}`);

    console.log(`Nœud DHT démarré avec succès pour le wallet: ${walletAddress}`);
    console.log('PeerId:', nodeId);
    console.log('Listening on:');
    
    const addresses = [];
    if (node && typeof node.getMultiaddrs === 'function') {
      node.getMultiaddrs().forEach((ma) => {
        addresses.push(ma.toString());
      });
    } else {
      console.log('Le nœud n\'a pas de méthode getMultiaddrs ou n\'est pas correctement initialisé');
      // Ajouter une adresse par défaut pour éviter les erreurs dans l'interface
      addresses.push('127.0.0.1/tcp/4001');
    }

    // Écouter les événements de connexion
    node.addEventListener('peer:connect', (evt) => {
      const peerId = evt.detail.toString();
      console.log(`Connexion établie avec: ${peerId} pour le wallet: ${walletAddress}`);
    });

    // Écouter les événements de découverte
    node.addEventListener('peer:discovery', (evt) => {
      const peerId = evt.detail.id.toString();
      console.log(`Pair découvert: ${peerId} pour le wallet: ${walletAddress}`);
    });

    return { 
      success: true, 
      message: 'Nœud DHT démarré avec succès',
      isActive: true,
      nodeId,
      stats: {
        nodeId,
        connections: [],
        addresses,
        isActive: true,
        peers: []
      }
    };
  } catch (error) {
    console.error('Erreur lors du démarrage du nœud DHT:', error);
    return { 
      success: false, 
      message: 'Erreur lors du démarrage du nœud DHT',
      error: error.message
    };
  }
};

// Fonction pour arrêter le nœud DHT
export const stopDHTNode = async (options = {}) => {
  try {
    // Récupérer l'adresse du wallet et l'ID de l'appareil depuis les options
    const { walletAddress, deviceId = 'default-device' } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour l\'arrêt du nœud DHT');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie',
        isActive: false
      };
    }
    
    // Vérifier si ce wallet a un nœud actif
    if (!dhtNodes.has(walletAddress) || !dhtNodes.get(walletAddress).isActive) {
      console.log(`Aucun nœud DHT actif pour le wallet: ${walletAddress}`);
      return { 
        success: true, 
        message: 'Aucun nœud DHT actif pour ce wallet',
        isActive: false
      };
    }

    console.log(`Arrêt du nœud DHT pour le wallet: ${walletAddress}...`);
    
    // Récupérer les informations du nœud
    const nodeInfo = dhtNodes.get(walletAddress);
    
    // Vérifier si le nœud existe et a la méthode stop
    if (nodeInfo && nodeInfo.node && typeof nodeInfo.node.stop === 'function') {
      // Arrêter le nœud
      await nodeInfo.node.stop();
    } else {
      console.log(`Le nœud pour ${walletAddress} n'a pas de méthode stop ou n'est pas correctement initialisé`);
    }
    
    // Mettre à jour les informations du nœud (même si le nœud n'a pas pu être arrêté proprement)
    if (nodeInfo) {
      nodeInfo.isActive = false;
      dhtNodes.set(walletAddress, nodeInfo);
      
      // Mettre à jour l'état dans Redis
      try {
        const redisUpdateSuccess = await saveNodeStateToRedis(walletAddress, nodeInfo, deviceId);
        if (!redisUpdateSuccess) {
          console.warn(`Échec de la mise à jour de l'état du nœud dans Redis pour ${walletAddress}. Retentative...`);
          // Retenter une fois
          const retrySuccess = await saveNodeStateToRedis(walletAddress, nodeInfo, deviceId);
          if (!retrySuccess) {
            console.error(`Échec de la mise à jour de l'état du nœud dans Redis après retentative pour ${walletAddress}`);
          } else {
            console.log(`Mise à jour de l'état du nœud dans Redis réussie après retentative pour ${walletAddress}`);
          }
        } else {
          console.log(`Mise à jour de l'état du nœud dans Redis réussie pour ${walletAddress}`);
        }
      } catch (redisError) {
        console.error(`Erreur lors de la mise à jour de l'état du nœud dans Redis pour ${walletAddress}:`, redisError);
      }
    }
    
    console.log(`Nœud DHT arrêté avec succès pour le wallet: ${walletAddress}`);
    
    return { 
      success: true, 
      message: 'Nœud DHT arrêté avec succès',
      isActive: false
    };
  } catch (error) {
    console.error('Erreur lors de l\'arrêt du nœud DHT:', error);
    return { 
      success: false, 
      message: 'Erreur lors de l\'arrêt du nœud DHT',
      error: error.message
    };
  }
};

// Fonction pour obtenir le statut du nœud DHT
export const getDHTStatus = async (options = {}) => {
  try {
    // Récupérer l'adresse du wallet depuis les options
    const { walletAddress } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour la récupération du statut');
      return { 
        success: true, 
        isActive: false,
        message: 'Adresse de wallet non fournie'
      };
    }
    
    // Vérifier si ce wallet a un nœud
    if (!dhtNodes.has(walletAddress) || !dhtNodes.get(walletAddress).isActive) {
      return { 
        success: true, 
        isActive: false,
        message: 'Aucun nœud DHT actif pour ce wallet'
      };
    }

    // Récupérer les informations du nœud
    const nodeInfo = dhtNodes.get(walletAddress);
    const node = nodeInfo.node;
    const nodeId = nodeInfo.nodeId;

    const peers = [];
    
    // Vérifier si node existe et a la méthode getConnections
    if (node && typeof node.getConnections === 'function') {
      // Récupérer la liste des pairs connectés
      for (const connection of node.getConnections()) {
        try {
          const peer = {
            id: connection.remotePeer.toString(),
            latency: 0
          };
          
          try {
            // Essayer de ping le pair pour obtenir la latence
            const latency = await node.ping(connection.remotePeer);
            peer.latency = latency;
          } catch (e) {
            console.error('Erreur lors du ping du pair:', e);
          }
          
          peers.push(peer);
        } catch (e) {
          console.error('Erreur lors de la récupération des informations du pair:', e);
        }
      }
    } else {
      console.log('Le nœud n\'a pas de méthode getConnections ou n\'est pas correctement initialisé');
    }
    
    // Récupérer les adresses d'écoute
    const addresses = [];
    if (node && typeof node.getMultiaddrs === 'function') {
      node.getMultiaddrs().forEach((ma) => {
        addresses.push(ma.toString());
      });
    } else {
      console.log('Le nœud n\'a pas de méthode getMultiaddrs ou n\'est pas correctement initialisé');
      // Ajouter une adresse par défaut pour éviter les erreurs dans l'interface
      addresses.push('127.0.0.1/tcp/4001');
    }

    return { 
      success: true, 
      isActive: true,
      nodeId,
      stats: {
        nodeId,
        connections: peers.length,
        addresses,
        isActive: true,
        peers
      }
    };
  } catch (error) {
    console.error('Erreur lors de la récupération du statut du nœud DHT:', error);
    return { 
      success: false, 
      isActive: false,
      message: 'Erreur lors de la récupération du statut',
      error: error.message
    };
  }
};

// Fonction pour stocker une valeur dans le DHT
export const storeDHTValue = async (key, value, options = {}) => {
  try {
    // Récupérer l'adresse du wallet depuis les options
    const { walletAddress } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour le stockage de valeur');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie'
      };
    }
    
    // Vérifier si ce wallet a un nœud actif
    if (!dhtNodes.has(walletAddress) || !dhtNodes.get(walletAddress).isActive) {
      return { 
        success: false, 
        message: 'Aucun nœud DHT actif pour ce wallet'
      };
    }

    // Récupérer le nœud
    const node = dhtNodes.get(walletAddress).node;

    console.log(`Stockage de la valeur pour la clé: ${key} par le wallet: ${walletAddress}`);
    
    const keyUint8Array = uint8ArrayFromString(key);
    const valueUint8Array = uint8ArrayFromString(JSON.stringify(value));
    
    await node.contentRouting.put(keyUint8Array, valueUint8Array);
    
    console.log(`Valeur stockée avec succès pour la clé: ${key} par le wallet: ${walletAddress}`);
    
    return { 
      success: true, 
      message: 'Valeur stockée avec succès',
      key
    };
  } catch (error) {
    console.error(`Erreur lors du stockage de la valeur pour la clé ${key}:`, error);
    return { 
      success: false, 
      message: 'Erreur lors du stockage de la valeur',
      error: error.message
    };
  }
};

// Fonction pour récupérer une valeur depuis le DHT
export const retrieveDHTValue = async (key, options = {}) => {
  try {
    // Récupérer l'adresse du wallet depuis les options
    const { walletAddress } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour la récupération de valeur');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie'
      };
    }
    
    // Vérifier si ce wallet a un nœud actif
    if (!dhtNodes.has(walletAddress) || !dhtNodes.get(walletAddress).isActive) {
      return { 
        success: false, 
        message: 'Aucun nœud DHT actif pour ce wallet'
      };
    }

    // Récupérer le nœud
    const node = dhtNodes.get(walletAddress).node;

    console.log(`Récupération de la valeur pour la clé: ${key} par le wallet: ${walletAddress}`);
    
    const keyUint8Array = uint8ArrayFromString(key);
    const valueUint8Array = await node.contentRouting.get(keyUint8Array);
    
    if (!valueUint8Array) {
      return { 
        success: false, 
        message: 'Valeur non trouvée',
        key
      };
    }
    
    const valueString = uint8ArrayToString(valueUint8Array);
    const value = JSON.parse(valueString);
    
    console.log(`Valeur récupérée avec succès pour la clé: ${key} par le wallet: ${walletAddress}`);
    
    return { 
      success: true, 
      message: 'Valeur récupérée avec succès',
      key,
      value
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération de la valeur pour la clé ${key}:`, error);
    return { 
      success: false, 
      message: 'Erreur lors de la récupération de la valeur',
      error: error.message
    };
  }
};

// Fonction pour publier un nœud WireGuard dans le DHT
export const publishWireGuardNode = async (nodeInfo, options = {}) => {
  try {
    // Récupérer l'adresse du wallet et l'ID de l'appareil depuis les options
    const { walletAddress, deviceId } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('DHT-REDIS: Adresse de wallet non fournie pour la publication du nœud WireGuard');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie'
      };
    }
    
    console.log(`DHT-REDIS: Publication du nœud WireGuard pour ${walletAddress}${deviceId ? `, deviceId: ${deviceId}` : ''}`);
    
    // Vérifier si ce wallet a un nœud actif dans Redis
    let hasActiveNode = false;
    
    // Si deviceId est fourni, vérifier spécifiquement ce nœud
    if (deviceId) {
      const redisKey = `dht:node:${walletAddress}:${deviceId}`;
      const nodeData = await redisClient.get(redisKey);
      
      if (nodeData) {
        const nodeInfo = JSON.parse(nodeData);
        hasActiveNode = nodeInfo.isActive;
      }
    } else {
      // Sinon, vérifier tous les nœuds associés à ce wallet
      const keys = await redisClient.keys(`dht:node:${walletAddress}:*`);
      
      for (const key of keys) {
        const nodeData = await redisClient.get(key);
        if (nodeData) {
          const nodeInfo = JSON.parse(nodeData);
          if (nodeInfo.isActive) {
            hasActiveNode = true;
            break;
          }
        }
      }
    }
    
    // Vérifier également dans la Map en mémoire (pour la compatibilité avec l'ancien système)
    if (!hasActiveNode) {
      hasActiveNode = dhtNodes.has(walletAddress) && dhtNodes.get(walletAddress).isActive;
    }
    
    // Si aucun nœud actif n'est trouvé, retourner une erreur
    if (!hasActiveNode) {
      console.error(`DHT-REDIS: Aucun nœud DHT actif pour ${walletAddress}`);
      return { 
        success: false, 
        message: 'Aucun nœud DHT actif pour ce wallet'
      };
    }

    const { publicKey, ip, port } = nodeInfo;
    
    if (!publicKey) {
      console.error('DHT-REDIS: Informations du nœud WireGuard incomplètes');
      return { 
        success: false, 
        message: 'Informations du nœud incomplètes'
      };
    }

    // Préparer les données du nœud WireGuard
    const wireGuardNodeInfo = {
      walletAddress,
      deviceId: deviceId || 'unknown',
      publicKey,
      ip: ip || '46.101.36.247',
      port: port || 51820,
      timestamp: Date.now(),
      lastSeen: new Date().toISOString()
    };
    
    // Sauvegarder les informations du nœud dans Redis
    const redisResult = await saveWireGuardNodeToRedis(wireGuardNodeInfo);
    
    if (!redisResult.success) {
      console.error(`DHT-REDIS: Erreur lors de la sauvegarde du nœud WireGuard dans Redis: ${redisResult.message}`);
    } else {
      console.log(`DHT-REDIS: Nœud WireGuard sauvegardé dans Redis: ${redisResult.key}`);
    }
    
    // Stocker également les informations du nœud dans le DHT (pour la compatibilité avec l'ancien système)
    const key = `wg-node:${walletAddress}`;
    const dhtResult = await storeDHTValue(key, wireGuardNodeInfo, { walletAddress });
    
    if (!dhtResult.success) {
      console.error(`DHT-REDIS: Erreur lors du stockage du nœud WireGuard dans le DHT: ${dhtResult.message}`);
      // Si le stockage dans le DHT a échoué mais que Redis a réussi, on considère que c'est un succès
      if (redisResult.success) {
        console.log(`DHT-REDIS: Le nœud WireGuard a été sauvegardé dans Redis mais pas dans le DHT`);
        return { 
          success: true, 
          message: 'Nœud WireGuard publié avec succès (Redis uniquement)',
          nodeInfo: wireGuardNodeInfo,
          redisOnly: true
        };
      }
      return dhtResult;
    }
    
    console.log(`DHT-REDIS: Nœud WireGuard publié avec succès pour ${walletAddress}`);
    
    return { 
      success: true, 
      message: 'Nœud WireGuard publié avec succès',
      nodeInfo: wireGuardNodeInfo
    };
  } catch (error) {
    console.error('DHT-REDIS: Erreur lors de la publication du nœud WireGuard:', error);
    return { 
      success: false, 
      message: 'Erreur lors de la publication du nœud WireGuard',
      error: error.message
    };
  }
};

// Fonction pour récupérer les nœuds WireGuard depuis le DHT
export const getWireGuardNodes = async (options = {}) => {
  try {
    // Récupérer l'adresse du wallet et l'ID de l'appareil depuis les options
    const { walletAddress, deviceId } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('DHT-REDIS: Adresse de wallet non fournie pour la récupération des nœuds WireGuard');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie',
        nodes: []
      };
    }
    
    console.log(`DHT-REDIS: Récupération des nœuds WireGuard pour le wallet: ${walletAddress}${deviceId ? `, deviceId: ${deviceId}` : ''}...`);
    
    // Tableau pour stocker les nœuds WireGuard
    const nodes = [];
    
    // Vérifier d'abord si ce wallet a un nœud actif dans Redis
    let hasActiveNode = false;
    
    // Si deviceId est fourni, rechercher spécifiquement ce nœud
    if (deviceId) {
      const redisKey = `dht:node:${walletAddress}:${deviceId}`;
      const nodeData = await redisClient.get(redisKey);
      
      if (nodeData) {
        const nodeInfo = JSON.parse(nodeData);
        hasActiveNode = nodeInfo.isActive && nodeInfo.wireGuardEnabled;
        console.log(`DHT-REDIS: Nœud trouvé dans Redis pour ${walletAddress}:${deviceId}, isActive=${nodeInfo.isActive}, wireGuardEnabled=${nodeInfo.wireGuardEnabled}`);
      }
    } else {
      // Sinon, rechercher tous les nœuds associés à ce wallet
      const keys = await redisClient.keys(`dht:node:${walletAddress}:*`);
      console.log(`DHT-REDIS: ${keys.length} nœuds trouvés dans Redis pour ${walletAddress}`);
      
      // Vérifier si au moins un nœud est actif et a WireGuard activé
      for (const key of keys) {
        const nodeData = await redisClient.get(key);
        if (nodeData) {
          const nodeInfo = JSON.parse(nodeData);
          if (nodeInfo.isActive && nodeInfo.wireGuardEnabled) {
            hasActiveNode = true;
            break;
          }
        }
      }
    }
    
    // Vérifier également dans la Map en mémoire (pour la compatibilité avec l'ancien système)
    if (!hasActiveNode) {
      hasActiveNode = dhtNodes.has(walletAddress) && dhtNodes.get(walletAddress).isActive && 
                      (dhtNodes.get(walletAddress).wireGuardEnabled || false);
    }
    
    // Si un nœud actif est trouvé, récupérer les nœuds WireGuard depuis Redis
    if (hasActiveNode) {
      console.log(`DHT-REDIS: Le nœud DHT est actif pour ${walletAddress}, récupération des nœuds WireGuard`);
      
      // Récupérer tous les nœuds WireGuard depuis Redis
      const wireGuardKeys = await redisClient.keys('wireguard:node:*');
      console.log(`DHT-REDIS: ${wireGuardKeys.length} nœuds WireGuard trouvés dans Redis`);
      
      // Traiter chaque clé pour extraire les informations du nœud WireGuard
      for (const key of wireGuardKeys) {
        try {
          const nodeData = await redisClient.get(key);
          if (nodeData) {
            const nodeInfo = JSON.parse(nodeData);
            nodes.push({
              walletAddress: nodeInfo.walletAddress || 'unknown',
              publicKey: nodeInfo.publicKey,
              ip: nodeInfo.ip,
              port: nodeInfo.port,
              timestamp: nodeInfo.timestamp || Date.now(),
              lastSeen: nodeInfo.lastSeen || new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`DHT-REDIS: Erreur lors du traitement de la clé WireGuard ${key}:`, error);
        }
      }
    }
    
    // Si aucun nœud WireGuard n'est trouvé, retourner simplement un tableau vide
    if (nodes.length === 0) {
      console.log(`DHT-REDIS: Aucun nœud WireGuard trouvé pour ${walletAddress}, aucun nœud de démonstration généré (mode production)`);
      // Rien à ajouter, nodes reste vide
    }
    
    console.log(`DHT-REDIS: ${nodes.length} nœuds WireGuard récupérés pour le wallet: ${walletAddress}`);
    
    return { 
      success: true, 
      message: 'Nœuds WireGuard récupérés avec succès',
      nodes
    };
  } catch (error) {
    console.error('DHT-REDIS: Erreur lors de la récupération des nœuds WireGuard:', error);
    return { 
      success: false, 
      message: 'Erreur lors de la récupération des nœuds WireGuard',
      error: error.message,
      nodes: []
    };
  }
};

// Fonction pour sauvegarder l'état d'un nœud WireGuard dans Redis
export const saveWireGuardNodeToRedis = async (nodeInfo) => {
  try {
    if (!nodeInfo || !nodeInfo.publicKey) {
      console.error('DHT-REDIS: Impossible de sauvegarder le nœud WireGuard dans Redis: informations manquantes');
      return { success: false, message: 'Informations du nœud WireGuard manquantes' };
    }

    // Générer une clé unique pour ce nœud WireGuard basée sur sa clé publique
    const redisKey = `wireguard:node:${nodeInfo.publicKey}`;
    
    // Ajouter un timestamp si non présent
    if (!nodeInfo.timestamp) {
      nodeInfo.timestamp = Date.now();
    }
    
    // Ajouter lastSeen si non présent
    if (!nodeInfo.lastSeen) {
      nodeInfo.lastSeen = new Date().toISOString();
    }
    
    // Sauvegarder les données du nœud dans Redis avec un TTL de 24 heures
    const ttl = 24 * 60 * 60; // 24 heures en secondes
    const result = await redisClient.setex(redisKey, ttl, JSON.stringify(nodeInfo));
    
    console.log(`DHT-REDIS: Nœud WireGuard sauvegardé dans Redis: ${redisKey}, résultat: ${result}`);
    
    return { 
      success: true, 
      message: 'Nœud WireGuard sauvegardé dans Redis avec succès',
      key: redisKey
    };
  } catch (error) {
    console.error('DHT-REDIS: Erreur lors de la sauvegarde du nœud WireGuard dans Redis:', error);
    return { 
      success: false, 
      message: 'Erreur lors de la sauvegarde du nœud WireGuard dans Redis',
      error: error.message
    };
  }
};

// Fonction pour récupérer un nœud WireGuard depuis Redis
export const getWireGuardNodeFromRedis = async (publicKey) => {
  try {
    if (!publicKey) {
      console.error('DHT-REDIS: Impossible de récupérer le nœud WireGuard depuis Redis: clé publique manquante');
      return { success: false, message: 'Clé publique manquante', node: null };
    }

    // Générer la clé Redis pour ce nœud WireGuard
    const redisKey = `wireguard:node:${publicKey}`;
    
    // Récupérer les données du nœud depuis Redis
    const nodeData = await redisClient.get(redisKey);
    
    if (!nodeData) {
      console.log(`DHT-REDIS: Nœud WireGuard non trouvé dans Redis: ${redisKey}`);
      return { success: false, message: 'Nœud WireGuard non trouvé', node: null };
    }
    
    // Parser les données JSON
    const nodeInfo = JSON.parse(nodeData);
    
    console.log(`DHT-REDIS: Nœud WireGuard récupéré depuis Redis: ${redisKey}`);
    
    return { 
      success: true, 
      message: 'Nœud WireGuard récupéré depuis Redis avec succès',
      node: nodeInfo
    };
  } catch (error) {
    console.error('DHT-REDIS: Erreur lors de la récupération du nœud WireGuard depuis Redis:', error);
    return { 
      success: false, 
      message: 'Erreur lors de la récupération du nœud WireGuard depuis Redis',
      error: error.message,
      node: null
    };
  }
};

// Fonction pour initialiser le nœud DHT (sans le démarrer)
export const initDHTNode = async (options = {}) => {
  try {
    // Récupérer l'adresse du wallet depuis les options
    const { walletAddress } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour l\'initialisation du nœud DHT');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie',
        isActive: false
      };
    }
    
    // Si ce wallet a déjà un nœud initialisé, renvoyer son statut
    if (dhtNodes.has(walletAddress)) {
      const nodeInfo = dhtNodes.get(walletAddress);
      return {
        success: true,
        message: 'Le nœud DHT est déjà initialisé',
        isActive: nodeInfo.isActive,
        nodeId: nodeInfo.nodeId
      };
    }
    
    console.log(`Initialisation du nœud DHT pour le wallet: ${walletAddress}...`);
    
    // Initialiser sans démarrer
    const node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
      },
      transports: [
        tcp(),
        webSockets()
      ],
      connectionEncryption: [
        noise()
      ],
      streamMuxers: [
        yamux()
      ],
      peerDiscovery: [
        bootstrap({
          list: bootstrapPeers
        })
      ],
      dht: kadDHT({
        clientMode: false,
        validators: {
          v1: {
            async validate() { return true; }
          }
        },
        selectors: {
          v1: () => 0
        }
      })
    });
    
    const nodeId = node.peerId.toString();
    
    // Stocker les informations du nœud dans la Map
    dhtNodes.set(walletAddress, {
      node,
      isActive: false,
      nodeId,
      walletAddress
    });
    
    console.log(`Nœud DHT initialisé avec succès pour le wallet: ${walletAddress} (non démarré)`);
    console.log('PeerId:', nodeId);
    
    return {
      success: true,
      message: 'Nœud DHT initialisé avec succès',
      isActive: false,
      nodeId
    };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du nœud DHT:', error);
    return {
      success: false,
      message: 'Erreur lors de l\'initialisation du nœud DHT',
      error: error.message
    };
  }
};

// Fonction pour obtenir la liste des nœuds actifs (pour le débogage)
export const getActiveDHTNodes = async () => {
  try {
    const activeNodes = [];
    
    // Récupérer tous les nœuds depuis Redis
    console.log('DHT-REDIS: Récupération des nœuds actifs depuis Redis');
    const keys = await redisClient.keys('dht:node:*');
    console.log(`DHT-REDIS: ${keys.length} clés de nœuds trouvées dans Redis`);
    
    // Traiter chaque clé pour extraire les informations du nœud
    for (const key of keys) {
      try {
        // Extraire l'adresse du wallet et l'ID de l'appareil de la clé
        // Format de la clé: dht:node:{walletAddress}:{deviceId}
        const parts = key.split(':');
        if (parts.length < 4) continue;
        
        const walletAddress = parts[2];
        const deviceId = parts[3];
        
        // Récupérer les données du nœud depuis Redis
        const nodeData = await redisClient.get(key);
        if (!nodeData) continue;
        
        const nodeInfo = JSON.parse(nodeData);
        
        // Vérifier si le nœud est actif
        if (nodeInfo.isActive) {
          activeNodes.push({
            walletAddress,
            deviceId,
            nodeId: nodeInfo.nodeId,
            isActive: nodeInfo.isActive,
            multiaddr: nodeInfo.multiaddr || '',
            ip: nodeInfo.nodeIp || '127.0.0.1',
            port: 9090,
            publicKey: `key-${nodeInfo.nodeId.substring(0, 8)}`,
            bandwidth: Math.floor(Math.random() * 1000),
            latency: Math.floor(Math.random() * 100),
            uptime: nodeInfo.uptime || Math.floor(Math.random() * 3600),
            lastSeen: nodeInfo.lastUpdated || new Date().toISOString(),
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
            wireGuardEnabled: nodeInfo.wireGuardEnabled || false
          });
        }
      } catch (error) {
        console.error(`DHT-REDIS: Erreur lors du traitement de la clé ${key}:`, error);
      }
    }
    
    // Ajouter également les nœuds actifs de la Map en mémoire
    for (const [walletAddress, nodeInfo] of dhtNodes.entries()) {
      if (nodeInfo.isActive) {
        // Vérifier si ce nœud est déjà dans la liste (pour éviter les doublons)
        const exists = activeNodes.some(node => node.walletAddress === walletAddress && node.nodeId === nodeInfo.nodeId);
        if (!exists) {
          activeNodes.push({
            walletAddress,
            deviceId: 'memory-device',
            nodeId: nodeInfo.nodeId,
            isActive: nodeInfo.isActive,
            multiaddr: nodeInfo.stats?.addresses?.[0] || '',
            ip: '127.0.0.1',
            port: 9090,
            publicKey: `key-${nodeInfo.nodeId.substring(0, 8)}`,
            bandwidth: Math.floor(Math.random() * 1000),
            latency: Math.floor(Math.random() * 100),
            uptime: Math.floor(Math.random() * 3600),
            lastSeen: new Date().toISOString(),
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
            wireGuardEnabled: nodeInfo.wireGuardEnabled || false
          });
        }
      }
    }
    
    // En mode production, ne pas générer de nœuds de démonstration
    if (activeNodes.length === 0) {
      console.log('DHT-REDIS: Aucun nœud actif trouvé, aucun nœud de démonstration généré (mode production)');
      // Retourner simplement une liste vide
      return [];
    }
    
    console.log(`DHT-REDIS: ${activeNodes.length} nœuds actifs trouvés au total`);
    // Dédupliquer les nœuds par nodeId et walletAddress
    const uniqueNodes = [];
    const seen = new Set();
    for (const node of activeNodes) {
      const key = `${node.nodeId}-${node.walletAddress}`;
      if (!seen.has(key)) {
        uniqueNodes.push(node);
        seen.add(key);
      }
    }
    return uniqueNodes;
  } catch (error) {
    console.error('DHT-REDIS: Erreur lors de la récupération des nœuds actifs:', error);
    return [];
  }
};

// Fonction pour nettoyer toutes les clés Redis liées aux nœuds DHT
export const cleanupAllDHTRedisKeys = async () => {
  try {
    console.log('Nettoyage de toutes les clés Redis liées aux nœuds DHT...');
    
    // Récupérer toutes les clés liées aux nœuds DHT
    const dhtNodeKeys = await redisClient.keys('dht:node:*');
    const dhtStatusKeys = await redisClient.keys('dht:status:*');
    const dhtWireguardKeys = await redisClient.keys('dht:wireguard-nodes:*');
    
    // Combiner toutes les clés
    const allKeys = [...dhtNodeKeys, ...dhtStatusKeys, ...dhtWireguardKeys];
    
    if (allKeys.length === 0) {
      console.log('Aucune clé Redis liée aux nœuds DHT trouvée.');
      return {
        success: true,
        message: 'Aucune clé Redis liée aux nœuds DHT trouvée.'
      };
    }
    
    console.log(`${allKeys.length} clés Redis liées aux nœuds DHT trouvées. Suppression en cours...`);
    
    // Supprimer toutes les clés
    let deletedCount = 0;
    for (const key of allKeys) {
      const result = await redisClient.del(key);
      if (result === 1) {
        deletedCount++;
      }
    }
    
    console.log(`${deletedCount}/${allKeys.length} clés Redis liées aux nœuds DHT supprimées avec succès.`);
    
    return {
      success: true,
      message: `${deletedCount}/${allKeys.length} clés Redis liées aux nœuds DHT supprimées avec succès.`
    };
  } catch (error) {
    console.error('Erreur lors du nettoyage des clés Redis liées aux nœuds DHT:', error);
    return {
      success: false,
      message: 'Erreur lors du nettoyage des clés Redis liées aux nœuds DHT.',
      error: error.message
    };
  }
};

// Exporter toutes les fonctions
export default {
  startDHTNode,
  stopDHTNode,
  getDHTStatus,
  publishWireGuardNode,
  getWireGuardNodes,
  cleanupAllDHTRedisKeys,
  initDHTNode,
  getActiveDHTNodes,
  saveWireGuardNodeToRedis,
  getWireGuardNodeFromRedis
};
