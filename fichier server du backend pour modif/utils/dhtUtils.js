// utils/dhtUtils.js
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

// Structure pour stocker les nœuds DHT par wallet
const dhtNodes = new Map();

// Bootstraps peers communs
let bootstrapPeers = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/ip4/46.101.36.247/tcp/4001/p2p/12D3KooWJWEKvSFbben74tNQjPe5kmiRgRJmVJLqE5iKXZ89bPbQ'
];

// Fonction pour initialiser et démarrer un nœud DHT
export const startDHTNode = async (options = {}) => {
  try {
    // Récupérer l'adresse du wallet depuis les options
    const { walletAddress } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour le démarrage du nœud DHT');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie',
        isActive: false
      };
    }
    
    // Vérifier si ce wallet a déjà un nœud actif
    if (dhtNodes.has(walletAddress) && dhtNodes.get(walletAddress).isActive) {
      console.log(`Le nœud DHT est déjà actif pour le wallet: ${walletAddress}`);
      const nodeInfo = dhtNodes.get(walletAddress);
      return { 
        success: true, 
        message: 'Le nœud DHT est déjà actif',
        isActive: true,
        nodeId: nodeInfo.nodeId
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
    dhtNodes.set(walletAddress, {
      node,
      isActive: true,
      nodeId,
      walletAddress
    });

    console.log(`Nœud DHT démarré avec succès pour le wallet: ${walletAddress}`);
    console.log('PeerId:', nodeId);
    console.log('Listening on:');
    
    const addresses = [];
    node.getMultiaddrs().forEach((ma) => {
      addresses.push(ma.toString());
      console.log(ma.toString());
    });

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
        addresses,
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
    // Récupérer l'adresse du wallet depuis les options
    const { walletAddress } = options;
    
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
    
    // Arrêter le nœud
    await nodeInfo.node.stop();
    
    // Mettre à jour les informations du nœud
    nodeInfo.isActive = false;
    dhtNodes.set(walletAddress, nodeInfo);
    
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

    // Récupérer les adresses d'écoute
    const addresses = [];
    node.getMultiaddrs().forEach((ma) => {
      addresses.push(ma.toString());
    });

    return { 
      success: true, 
      isActive: true,
      nodeId,
      stats: {
        addresses,
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
    // Récupérer l'adresse du wallet depuis les options
    const { walletAddress } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour la publication du nœud WireGuard');
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

    const { publicKey, ip, port } = nodeInfo;
    
    if (!publicKey) {
      return { 
        success: false, 
        message: 'Informations du nœud incomplètes'
      };
    }

    console.log(`Publication du nœud WireGuard pour ${walletAddress}`);
    
    // Stocker les informations du nœud dans le DHT
    const key = `wg-node:${walletAddress}`;
    const value = {
      walletAddress,
      publicKey,
      ip: ip || '46.101.36.247',
      port: port || 51820,
      timestamp: Date.now()
    };
    
    const result = await storeDHTValue(key, value, { walletAddress });
    
    if (!result.success) {
      return result;
    }
    
    console.log(`Nœud WireGuard publié avec succès pour ${walletAddress}`);
    
    return { 
      success: true, 
      message: 'Nœud WireGuard publié avec succès',
      nodeInfo: value
    };
  } catch (error) {
    console.error('Erreur lors de la publication du nœud WireGuard:', error);
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
    // Récupérer l'adresse du wallet depuis les options
    const { walletAddress } = options;
    
    // Vérifier si une adresse de wallet est fournie
    if (!walletAddress) {
      console.error('Adresse de wallet non fournie pour la récupération des nœuds WireGuard');
      return { 
        success: false, 
        message: 'Adresse de wallet non fournie',
        nodes: []
      };
    }
    
    // Vérifier si ce wallet a un nœud actif
    if (!dhtNodes.has(walletAddress) || !dhtNodes.get(walletAddress).isActive) {
      return { 
        success: false, 
        message: 'Aucun nœud DHT actif pour ce wallet',
        nodes: []
      };
    }

    console.log(`Récupération des nœuds WireGuard pour le wallet: ${walletAddress}...`);
    
    // Dans une implémentation réelle, vous récupéreriez tous les nœuds WireGuard
    // depuis le DHT en utilisant un préfixe de clé ou une autre méthode
    // Pour l'instant, nous simulons quelques nœuds
    
    const nodes = [
      {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        publicKey: 'wg-public-key-1',
        ip: '46.101.36.247',
        port: 51820,
        timestamp: Date.now() - 3600000
      },
      {
        walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        publicKey: 'wg-public-key-2',
        ip: '46.101.36.247',
        port: 51821,
        timestamp: Date.now() - 7200000
      }
    ];
    
    console.log(`${nodes.length} nœuds WireGuard récupérés pour le wallet: ${walletAddress}`);
    
    return { 
      success: true, 
      message: 'Nœuds WireGuard récupérés avec succès',
      nodes
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des nœuds WireGuard:', error);
    return { 
      success: false, 
      message: 'Erreur lors de la récupération des nœuds WireGuard',
      error: error.message,
      nodes: []
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
export const getActiveDHTNodes = () => {
  const activeNodes = [];
  
  for (const [walletAddress, nodeInfo] of dhtNodes.entries()) {
    if (nodeInfo.isActive) {
      activeNodes.push({
        walletAddress,
        nodeId: nodeInfo.nodeId,
        isActive: nodeInfo.isActive
      });
    }
  }
  
  return activeNodes;
};

export default {
  startDHTNode,
  stopDHTNode,
  getDHTStatus,
  storeDHTValue,
  retrieveDHTValue,
  publishWireGuardNode,
  getWireGuardNodes,
  initDHTNode,
  getActiveDHTNodes
};
