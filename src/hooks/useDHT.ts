// src/hooks/useDHT.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { config } from '@/config/env';
import { useWalletContext } from '@/contexts/WalletContext';

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
      const response = await fetch(`${config.API_BASE_URL}dht/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du statut du nœud DHT');
      }

      const data = await response.json();
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
      const response = await fetch(`${config.API_BASE_URL}dht/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du démarrage du nœud DHT');
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchStatus();
      } else {
        throw new Error(data.message || 'Erreur lors du démarrage du nœud DHT');
      }
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
      const response = await fetch(`${config.API_BASE_URL}dht/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'arrêt du nœud DHT');
      }

      const data = await response.json();
      
      if (data.success) {
        setStatus({ isActive: false });
      } else {
        throw new Error(data.message || 'Erreur lors de l\'arrêt du nœud DHT');
      }
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
      const response = await fetch(`${config.API_BASE_URL}dht/nodes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des nœuds DHT');
      }

      const data = await response.json();
      
      if (data.success) {
        setNodes(data.nodes);
      } else {
        throw new Error(data.message || 'Erreur lors de la récupération des nœuds DHT');
      }
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
      const response = await fetch(`${config.API_BASE_URL}dht/wireguard/nodes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des nœuds WireGuard');
      }

      const data = await response.json();
      
      if (data.success) {
        setWireGuardNodes(data.nodes);
      } else {
        throw new Error(data.message || 'Erreur lors de la récupération des nœuds WireGuard');
      }
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
      const response = await fetch(`${config.API_BASE_URL}dht/wireguard/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ walletAddress })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la publication du nœud WireGuard');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erreur lors de la publication du nœud WireGuard');
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
      const response = await fetch(`${config.API_BASE_URL}dht/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ key, value })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du stockage de la valeur dans le DHT');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erreur lors du stockage de la valeur dans le DHT');
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
      const response = await fetch(`${config.API_BASE_URL}dht/retrieve/${key}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Erreur lors de la récupération de la valeur depuis le DHT');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erreur lors de la récupération de la valeur depuis le DHT');
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
