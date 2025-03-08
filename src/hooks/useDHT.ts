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
}

export function useDHT() {
  const { isAuthenticated } = useAuth();
  const { account: walletAddress } = useWalletContext();
  const [status, setStatus] = useState<DHTStatus>({ isActive: false });
  const [nodes, setNodes] = useState<DHTNode[]>([]);
  const [wireGuardNodes, setWireGuardNodes] = useState<WireGuardNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer le statut du nœud DHT
  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.getDHTStatus();
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      setStatus({
        isActive: data.isActive,
        nodeId: data.nodeId,
        stats: data.stats
      });
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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

  // Fonction pour récupérer la liste des nœuds DHT
  const fetchNodes = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.getDHTNodes();
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      setNodes(data.nodes || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fonction pour récupérer la liste des nœuds WireGuard via DHT
  const fetchWireGuardNodes = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await dhtUtils.getWireGuardNodes();
      
      if (data.success === false && data.error) {
        throw new Error(data.error);
      }
      
      setWireGuardNodes(data.nodes || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
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
    retrieveValue
  };
}
