// src/hooks/useDHT.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWalletContext } from '@/contexts/WalletContext';
import * as dhtUtils from '@/utils/dhtUtils';

interface DHTNode {
  nodeId: string;
  walletAddress: string;
  publicKey: string;
  ip: string;
  port: number;
  multiaddr: string;
  isActive: boolean;
  isHost: boolean;
  bandwidth?: number;
  latency?: number;
  uptime?: number;
  lastSeen: string;
  createdAt: string;
}

interface DHTNodeStats {
  nodeId: string;
  connections: number;
  addresses: string[];
  isActive: boolean;
  peers: {
    id: string;
    direction: string;
    latency: number;
  }[];
}

interface DHTStatus {
  isActive: boolean;
  nodeId?: string;
  stats?: DHTNodeStats;
}

interface WireGuardNode {
  id: string;
  walletAddress: string;
  publicKey: string;
  ip: string;
  port: number;
  lastSeen: string;
  isActive: boolean;
}

export function useDHT() {
  const { isAuthenticated } = useAuth();
  const { account: walletAddress } = useWalletContext();
  const [status, setStatus] = useState<DHTStatus>({ isActive: false });
  const [nodes, setNodes] = useState<DHTNode[]>([]);
  const [wireGuardNodes, setWireGuardNodes] = useState<WireGuardNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingWireGuard, setIsLoadingWireGuard] = useState(false);
  // Intervalle de rafraîchissement automatique (en millisecondes)
  const [pollingInterval, setPollingInterval] = useState<number>(30000); // 30 secondes par défaut
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(true);

  // Fonction pour récupérer le statut du nœud DHT
  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated || !walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      // Utiliser la nouvelle fonction pour récupérer le statut spécifique au wallet
      const data = await dhtUtils.getDHTStatusByWallet(walletAddress);
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      // Validation des données reçues
      const sanitizedStats = data.stats ? {
        nodeId: data.nodeId || '',
        connections: data.stats.connections || 0,
        addresses: Array.isArray(data.stats.addresses) ? data.stats.addresses : [],
        isActive: Boolean(data.isActive),
        peers: Array.isArray(data.stats.peers) ? data.stats.peers.map((peer: any) => ({
          id: peer?.id || '',
          direction: peer?.direction || 'N/A',
          latency: typeof peer?.latency === 'number' ? peer.latency : 0
        })) : []
      } : undefined;
      
      setStatus({
        isActive: Boolean(data.isActive),
        nodeId: data.nodeId || '',
        stats: sanitizedStats
      });
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, walletAddress]);

  // Fonction pour démarrer le nœud DHT
  const startNode = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.startDHTNode();
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      await fetchStatus();
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchStatus]);

  // Fonction pour arrêter le nœud DHT
  const stopNode = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.stopDHTNode();
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      setStatus({ isActive: false });
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fonction pour générer des nœuds DHT de démonstration
  const generateDemoDHTNodes = (count: number = 5): DHTNode[] => {
    console.log(`Génération de ${count} nœuds DHT de démonstration`);
    const demoNodes: DHTNode[] = [];
    
    for (let i = 0; i < count; i++) {
      const nodeId = `demo-node-${i}-${Math.random().toString(36).substring(2, 8)}`;
      const walletAddress = `0x${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
      const publicKey = `pk-${Math.random().toString(36).substring(2, 15)}`;
      const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const port = 4000 + Math.floor(Math.random() * 1000);
      const multiaddr = `/ip4/${ip}/tcp/${port}/p2p/${nodeId}`;
      
      demoNodes.push({
        nodeId,
        walletAddress,
        publicKey,
        ip,
        port,
        multiaddr,
        isActive: true,
        isHost: i === 0, // Le premier nœud est l'hôte
        bandwidth: Math.floor(Math.random() * 500) + 100, // 100-600 Mbps
        latency: Math.floor(Math.random() * 50) + 5, // 5-55 ms
        uptime: Math.floor(Math.random() * 86400), // Temps en secondes (jusqu'à 24h)
        lastSeen: new Date().toISOString(),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString() // 0-30 jours
      });
    }
    
    console.log('Nœuds DHT de démonstration générés:', demoNodes);
    return demoNodes;
  };

  // Fonction pour générer des nœuds WireGuard de démonstration
  const generateDemoWireGuardNodes = (count: number = 3): WireGuardNode[] => {
    console.log(`Génération de ${count} nœuds WireGuard de démonstration`);
    
    return Array.from({ length: count }, (_, index) => {
      const id = `demo-wireguard-${index + 1}`;
      const randomWallet = `${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 10)}`;
      
      return {
        id,
        walletAddress: randomWallet,
        publicKey: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}=`,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        port: 51820 + Math.floor(Math.random() * 10),
        lastSeen: new Date().toISOString(),
        isActive: true
      };
    });
  };

  // Fonction pour récupérer la liste des nœuds DHT
  const fetchNodes = useCallback(async (useDemoNodesAsFallback = true) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.getDHTNodes();
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      // Vérifier si des nœuds sont disponibles
      if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        console.log('Aucun nœud DHT trouvé dans la réponse API');
        
        // Ne générer des nœuds de démonstration que si l'option est activée
        if (useDemoNodesAsFallback) {
          console.log('Génération de nœuds de démonstration comme solution de repli');
          const demoNodes = generateDemoDHTNodes(5);
          setNodes(demoNodes);
          return demoNodes;
        } else {
          console.log('Aucun nœud de démonstration généré car l\'option est désactivée');
          setNodes([]);
          return [];
        }
      }
      
      console.log('Nœuds DHT réels récupérés depuis l\'API:', data.nodes);
      setNodes(data.nodes);
      return data.nodes;
    } catch (err) {
      console.error('Erreur lors de la récupération des nœuds DHT:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      
      // En cas d'erreur, générer des nœuds de démonstration uniquement si l'option est activée
      if (useDemoNodesAsFallback) {
        console.log('Génération de nœuds de démonstration suite à une erreur');
        const demoNodes = generateDemoDHTNodes(5);
        setNodes(demoNodes);
        return demoNodes;
      } else {
        console.log('Aucun nœud de démonstration généré malgré l\'erreur car l\'option est désactivée');
        setNodes([]);
        return [];
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fonction pour récupérer la liste des nœuds WireGuard via DHT
  const fetchWireGuardNodes = useCallback(async (useDemoNodesAsFallback = true) => {
    if (!isAuthenticated) {
      console.log('Non authentifié, impossible de récupérer les nœuds WireGuard');
      return [];
    }
    
    setIsLoadingWireGuard(true);
    
    try {
      console.log('Récupération des nœuds WireGuard...');
      const data = await dhtUtils.getWireGuardNodes();
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      // Validation des données reçues
      const sanitizedNodes = Array.isArray(data.nodes) 
        ? data.nodes.map((node: any) => ({
            id: node?.id || '',
            walletAddress: node?.walletAddress || '',
            publicKey: node?.publicKey || '',
            ip: node?.ip || '',
            port: typeof node?.port === 'number' ? node.port : 0,
            lastSeen: node?.lastSeen || new Date().toISOString(),
            isActive: node?.isActive || false
          }))
        : [];
      
      // Si aucun nœud n'est disponible, utiliser des nœuds de démonstration uniquement si l'option est activée
      if (sanitizedNodes.length === 0) {
        console.log('Aucun nœud WireGuard disponible');
        
        if (useDemoNodesAsFallback) {
          console.log('Utilisation des nœuds WireGuard de démonstration comme solution de repli');
          const demoNodes = generateDemoWireGuardNodes(3);
          setWireGuardNodes(demoNodes);
          return demoNodes;
        } else {
          console.log('Aucun nœud de démonstration généré car l\'option est désactivée');
          setWireGuardNodes([]);
          return [];
        }
      }
      
      console.log(`${sanitizedNodes.length} nœuds WireGuard récupérés`);
      setWireGuardNodes(sanitizedNodes);
      return sanitizedNodes;
    } catch (err) {
      console.error('Erreur lors de la récupération des nœuds WireGuard:', err);
      
      // En cas d'erreur, utiliser des nœuds de démonstration uniquement si l'option est activée
      if (useDemoNodesAsFallback) {
        console.log('Utilisation des nœuds WireGuard de démonstration suite à une erreur');
        const demoNodes = generateDemoWireGuardNodes(3);
        setWireGuardNodes(demoNodes);
        return demoNodes;
      } else {
        console.log('Aucun nœud de démonstration généré malgré l\'erreur car l\'option est désactivée');
        setWireGuardNodes([]);
        return [];
      }
    } finally {
      setIsLoadingWireGuard(false);
    }
  }, [isAuthenticated]);

  // Fonction pour publier un nœud WireGuard dans le DHT
  const publishWireGuardNode = useCallback(async () => {
    if (!isAuthenticated || !walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.publishWireGuardNode(walletAddress);
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      return data.success;
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, walletAddress]);

  // Fonction pour stocker une valeur dans le DHT
  const storeValue = useCallback(async (key: string, value: any) => {
    if (!isAuthenticated) return false;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.storeDHTValue(key, value);
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      return true;
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fonction pour récupérer une valeur depuis le DHT
  const retrieveValue = useCallback(async (key: string) => {
    if (!isAuthenticated) return null;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.retrieveDHTValue(key);
      
      if (data.success === false) {
        if (data.error && data.error.includes('not found')) {
          return null;
        }
        throw new Error(data.error);
      }
      
      return data.value;
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Effet pour récupérer le statut initial
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
    }
  }, [isAuthenticated, fetchStatus]);

  // Effet pour mettre en place le polling automatique du statut DHT
  useEffect(() => {
    // Ne démarrer le polling que si l'utilisateur est authentifié et que le polling est activé
    if (!isAuthenticated || !isPollingEnabled) return;

    console.log(`Configuration du polling automatique du statut DHT toutes les ${pollingInterval / 1000} secondes`);
    
    // Créer un intervalle pour rafraîchir régulièrement le statut
    const intervalId = setInterval(() => {
      console.log('Polling automatique: récupération du statut DHT');
      fetchStatus();
    }, pollingInterval);
    
    // Nettoyer l'intervalle lorsque le composant est démonté ou que les dépendances changent
    return () => {
      console.log('Nettoyage du polling automatique du statut DHT');
      clearInterval(intervalId);
    };
  }, [isAuthenticated, fetchStatus, pollingInterval, isPollingEnabled]);

  return {
    status,
    nodes,
    wireGuardNodes,
    loading,
    error,
    fetchStatus,
    startNode,
    stopNode,
    fetchNodes,
    fetchWireGuardNodes,
    publishWireGuardNode,
    storeValue,
    retrieveValue,
    // Exposer les contrôles de polling
    pollingInterval,
    setPollingInterval,
    isPollingEnabled,
    setIsPollingEnabled
  };
}
