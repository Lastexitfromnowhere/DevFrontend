// utils/dhtUtils.modified.js
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

// Variables globales
let node = null;
let isNodeActive = false;
let nodeId = null;
// Nouvelle variable pour stocker l'adresse du wallet propriétaire du nœud
let nodeWalletAddress = null;
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
    
    if (isNodeActive && node) {
      console.log('Le nœud DHT est déjà actif');
      // Vérifier si le wallet qui fait la demande est le même que celui qui a démarré le nœud
      if (nodeWalletAddress && nodeWalletAddress !== walletAddress) {
        console.error(`Tentative de démarrage d'un nœud déjà actif par un autre wallet: ${walletAddress} (propriétaire: ${nodeWalletAddress})`);
        return { 
          success: false, 
          message: 'Un nœud DHT est déjà actif pour un autre wallet',
          isActive: false
        };
      }
      return { 
        success: true, 
        message: 'Le nœud DHT est déjà actif',
        isActive: true,
        nodeId
      };
    }

    console.log(`Démarrage du nœud DHT pour le wallet: ${walletAddress}...`);
    
    // Créer et démarrer un nœud libp2p
    node = await createLibp2p({
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
    isNodeActive = true;
    nodeId = node.peerId.toString();
    // Stocker l'adresse du wallet qui a démarré le nœud
    nodeWalletAddress = walletAddress;

    console.log('Nœud DHT démarré avec succès');
    console.log('PeerId:', nodeId);
    console.log('Wallet:', nodeWalletAddress);
    console.log('Listening on:');
    
    const addresses = [];
    node.getMultiaddrs().forEach((ma) => {
      addresses.push(ma.toString());
      console.log(ma.toString());
    });

    // Écouter les événements de connexion
    node.addEventListener('peer:connect', (evt) => {
      const peerId = evt.detail.toString();
      console.log('Connexion établie avec:', peerId);
    });

    // Écouter les événements de découverte
    node.addEventListener('peer:discovery', (evt) => {
      const peerId = evt.detail.id.toString();
      console.log('Pair découvert:', peerId);
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
        isActive: isNodeActive
      };
    }
    
    if (!isNodeActive || !node) {
      console.log('Le nœud DHT n\'est pas actif');
      return { 
        success: true, 
        message: 'Le nœud DHT n\'est pas actif',
        isActive: false
      };
    }
    
    // Vérifier si le wallet qui fait la demande est le même que celui qui a démarré le nœud
    if (nodeWalletAddress && nodeWalletAddress !== walletAddress) {
      console.error(`Tentative d'arrêt du nœud par un autre wallet: ${walletAddress} (propriétaire: ${nodeWalletAddress})`);
      return { 
        success: false, 
        message: 'Non autorisé à arrêter ce nœud DHT',
        isActive: true
      };
    }

    console.log(`Arrêt du nœud DHT pour le wallet: ${walletAddress}...`);
    
    // Arrêter le nœud
    await node.stop();
    isNodeActive = false;
    // Réinitialiser l'adresse du wallet propriétaire
    nodeWalletAddress = null;
    
    console.log('Nœud DHT arrêté avec succès');
    
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
    
    if (!isNodeActive || !node) {
      return { 
        success: true, 
        isActive: false,
        message: 'Le nœud DHT n\'est pas actif'
      };
    }
    
    // Vérifier si le wallet qui fait la demande est le même que celui qui a démarré le nœud
    if (walletAddress && nodeWalletAddress && nodeWalletAddress !== walletAddress) {
      console.log(`Tentative d'accès au statut du nœud par un autre wallet: ${walletAddress} (propriétaire: ${nodeWalletAddress})`);
      return { 
        success: true, 
        isActive: false,
        message: 'Aucun nœud DHT actif pour ce wallet'
      };
    }

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
export const storeDHTValue = async (key, value) => {
  try {
    if (!isNodeActive || !node) {
      return { 
        success: false, 
        message: 'Le nœud DHT n\'est pas actif'
      };
    }

    console.log(`Stockage de la valeur pour la clé: ${key}`);
    
    const keyUint8Array = uint8ArrayFromString(key);
    const valueUint8Array = uint8ArrayFromString(JSON.stringify(value));
    
    await node.contentRouting.put(keyUint8Array, valueUint8Array);
    
    console.log(`Valeur stockée avec succès pour la clé: ${key}`);
    
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
export const retrieveDHTValue = async (key) => {
  try {
    if (!isNodeActive || !node) {
      return { 
        success: false, 
        message: 'Le nœud DHT n\'est pas actif'
      };
    }

    console.log(`Récupération de la valeur pour la clé: ${key}`);
    
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
    
    console.log(`Valeur récupérée avec succès pour la clé: ${key}`);
    
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
export const publishWireGuardNode = async (nodeInfo) => {
  try {
    if (!isNodeActive || !node) {
      return { 
        success: false, 
        message: 'Le nœud DHT n\'est pas actif'
      };
    }

    const { walletAddress, publicKey, ip, port } = nodeInfo;
    
    if (!walletAddress || !publicKey) {
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
    
    const result = await storeDHTValue(key, value);
    
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
export const getWireGuardNodes = async () => {
  try {
    if (!isNodeActive || !node) {
      return { 
        success: false, 
        message: 'Le nœud DHT n\'est pas actif',
        nodes: []
      };
    }

    console.log('Récupération des nœuds WireGuard...');
    
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
    
    console.log(`${nodes.length} nœuds WireGuard récupérés`);
    
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
export const initDHTNode = async () => {
  try {
    // Si le nœud est déjà initialisé, renvoyer son statut
    if (node) {
      return {
        success: true,
        message: 'Le nœud DHT est déjà initialisé',
        isActive: isNodeActive,
        nodeId
      };
    }
    
    console.log('Initialisation du nœud DHT...');
    
    // Initialiser sans démarrer
    node = await createLibp2p({
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
    
    nodeId = node.peerId.toString();
    
    console.log('Nœud DHT initialisé avec succès (non démarré)');
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

// Exporter la variable nodeWalletAddress pour les tests et le débogage
export const getNodeWalletAddress = () => nodeWalletAddress;

export default {
  startDHTNode,
  stopDHTNode,
  getDHTStatus,
  storeDHTValue,
  retrieveDHTValue,
  publishWireGuardNode,
  getWireGuardNodes,
  initDHTNode,
  getNodeWalletAddress
};
