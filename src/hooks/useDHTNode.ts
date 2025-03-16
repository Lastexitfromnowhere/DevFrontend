// src/hooks/useDHTNode.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useWalletContext } from '@/contexts/WalletContext';
import { config } from '@/config/env';

// Définir les types pour les réponses API
interface DHTNodeStatus {
  active: boolean;
  nodeType?: string;
  nodeId?: string;
  nodeIp?: string;
  connectedPeers?: number;
  storageUsed?: number;
  totalStorage?: number;
  uptime?: number;
  lastUpdated?: string;
  protocol?: string;
  wireGuardEnabled?: boolean;  // Indique si WireGuard est activé sur ce nœud
  wireGuardConfig?: WireGuardConfig;  // Configuration WireGuard si disponible
}

interface DHTNodeResponse {
  success: boolean;
  message?: string;
  data?: {
    active: boolean;
    nodeType?: string;
    nodeId?: string;
    nodeIp?: string;
    connectedPeers?: number;
    storageUsed?: number;
    totalStorage?: number;
    uptime?: number;
    lastUpdated?: string;
    protocol?: string;
    wireGuardEnabled?: boolean;
    wireGuardConfig?: WireGuardConfig;
  };
}

// Interface pour la configuration WireGuard
interface WireGuardConfig {
  publicKey: string;
  privateKey?: string;
  address: string;
  port: number;
  dns?: string[];
  allowedIPs?: string[];
  endpoint?: string;
  persistentKeepalive?: number;
  status?: 'active' | 'inactive' | 'connecting' | 'error';
  lastConnected?: string;
  peerPublicKey?: string;
}

interface WireGuardPeer {
  publicKey: string;
  allowedIPs: string[];
  endpoint?: string;
  persistentKeepalive?: number;
  lastHandshake?: string;
  transferRx?: number;
  transferTx?: number;
}

// Interface pour les erreurs Axios
interface AxiosErrorResponse {
  response?: {
    status: number;
    data?: any;
  };
  message?: string;
}

// Configuration de base d'Axios avec logs
const api = axios.create({
  timeout: config.DEFAULT_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
});

// Intercepteur pour ajouter l'adresse du wallet à toutes les requêtes
api.interceptors.request.use(
  (config) => {
    // Récupérer l'adresse du wallet depuis le localStorage
    const walletAddress = localStorage.getItem('walletAddress');
    
    // Si l'adresse existe, l'ajouter aux en-têtes
    if (walletAddress && config.headers) {
      config.headers['X-Wallet-Address'] = walletAddress;
      config.headers['Authorization'] = `Bearer ${walletAddress}`;
    }
    
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

export function useDHTNode() {
  // État pour stocker les informations sur le noeud DHT
  const [status, setStatus] = useState<DHTNodeStatus>({
    active: false,
    nodeType: '',
    nodeId: '',
    nodeIp: '',
    connectedPeers: 0,
    storageUsed: 0,
    totalStorage: 0,
    uptime: 0,
    lastUpdated: '',
    protocol: '',
    wireGuardEnabled: false
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // État pour les configurations WireGuard
  const [wireGuardConfig, setWireGuardConfig] = useState<WireGuardConfig | null>(null);
  const [wireGuardPeers, setWireGuardPeers] = useState<WireGuardPeer[]>([]);
  const [wireGuardLoading, setWireGuardLoading] = useState(false);
  const [wireGuardError, setWireGuardError] = useState<string | null>(null);
  
  // Références pour le polling et les tentatives
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const statusRetryCount = useRef(0);
  const maxRetryDelay = 60000; // 1 minute maximum entre les tentatives
  
  // Contexte du wallet
  const { isConnected, account } = useWalletContext();
  
  // Fonction pour récupérer le statut du noeud DHT
  const fetchDHTNodeStatus = useCallback(async () => {
    if (!isConnected || !account) {
      setStatus({
        active: false,
        nodeType: '',
        nodeId: '',
        nodeIp: '',
        connectedPeers: 0,
        storageUsed: 0,
        totalStorage: 0,
        uptime: 0,
        lastUpdated: '',
        protocol: '',
        wireGuardEnabled: false
      });
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Vérifier si nous avons des données en cache
      const cachedData = localStorage.getItem('dhtNodeStatus');
      let cachedStatus: DHTNodeStatus | null = null;
      
      if (cachedData) {
        try {
          cachedStatus = JSON.parse(cachedData) as DHTNodeStatus;
          // Utiliser les données en cache pendant le chargement
          setStatus(cachedStatus);
        } catch (e) {
          console.error('Error parsing cached DHT node status:', e);
          localStorage.removeItem('dhtNodeStatus');
        }
      }
      
      // Appel API pour récupérer les données fraîches
      const response = await api.get<DHTNodeResponse>(`${config.API_BASE_URL}/dht/status`);
      
      if (response.data && response.data.success) {
        const nodeData = response.data.data;
        
        // Mettre à jour l'état avec les nouvelles données
        const updatedStatus: DHTNodeStatus = {
          active: nodeData?.active || false,
          nodeType: nodeData?.nodeType || '',
          nodeId: nodeData?.nodeId || '',
          nodeIp: nodeData?.nodeIp || '',
          connectedPeers: nodeData?.connectedPeers || 0,
          storageUsed: nodeData?.storageUsed || 0,
          totalStorage: nodeData?.totalStorage || 0,
          uptime: nodeData?.uptime || 0,
          lastUpdated: nodeData?.lastUpdated || new Date().toISOString(),
          protocol: nodeData?.protocol || 'DHT',
          wireGuardEnabled: nodeData?.wireGuardEnabled || false,
          wireGuardConfig: nodeData?.wireGuardConfig || undefined
        };
        
        // Mettre en cache les données
        localStorage.setItem('dhtNodeStatus', JSON.stringify(updatedStatus));
        
        // Mettre à jour l'état
        setStatus(updatedStatus);
        
        // Si WireGuard est activé, mettre à jour la configuration
        if (updatedStatus.wireGuardEnabled && updatedStatus.wireGuardConfig) {
          setWireGuardConfig(updatedStatus.wireGuardConfig);
        }
        
        statusRetryCount.current = 0; // Réinitialiser le compteur de tentatives
      } else {
        throw new Error(response.data?.message || 'Failed to fetch DHT node status');
      }
    } catch (error: unknown) {
      console.error('Error fetching DHT node status:', error);
      statusRetryCount.current += 1;
      
      // Calculer un délai exponentiel pour la prochaine tentative
      const retryDelay = Math.min(1000 * Math.pow(2, statusRetryCount.current), maxRetryDelay);
      console.log(`Retrying in ${retryDelay}ms (attempt ${statusRetryCount.current})`);
      
      // Si l'erreur est liée à l'authentification, réinitialiser l'état
      const axiosError = error as AxiosErrorResponse;
      if (axiosError.response && axiosError.response.status === 401) {
        setError('Authentication failed. Please reconnect your wallet.');
      } else {
        setError('Failed to fetch DHT node status. Retrying...');
      }
      
      // Planifier une nouvelle tentative après un délai
      setTimeout(() => {
        fetchDHTNodeStatus();
      }, retryDelay);
    } finally {
      setLoading(false);
    }
  }, [isConnected, account]);
  
  // Fonction pour récupérer la configuration WireGuard
  const fetchWireGuardConfig = useCallback(async () => {
    if (!isConnected || !account) {
      setWireGuardError('Wallet not connected');
      return null;
    }
    
    setWireGuardLoading(true);
    setWireGuardError(null);
    
    try {
      const response = await api.get(`${config.API_BASE_URL}/wireguard/config`);
      
      // Type assertion pour response.data
      const responseData = response.data as any;
      
      if (responseData && responseData.success) {
        const wireGuardConfig = responseData.config as WireGuardConfig;
        setWireGuardConfig(wireGuardConfig);
        
        // Mettre à jour le statut pour refléter que WireGuard est activé
        setStatus(prevStatus => ({
          ...prevStatus,
          wireGuardEnabled: true,
          wireGuardConfig: wireGuardConfig,
          protocol: 'WireGuard'
        }));
        
        return wireGuardConfig;
      } else {
        const errorMessage = responseData?.message || 'Failed to fetch WireGuard configuration';
        throw new Error(errorMessage);
      }
    } catch (error: unknown) {
      console.error('Error fetching WireGuard configuration:', error);
      
      const axiosError = error as AxiosErrorResponse;
      if (axiosError.response && axiosError.response.status === 404) {
        // WireGuard n'est pas configuré
        setWireGuardConfig(null);
        setStatus(prevStatus => ({
          ...prevStatus,
          wireGuardEnabled: false,
          protocol: 'DHT'
        }));
      }
      
      setWireGuardError(error instanceof Error ? error.message : 'Failed to fetch WireGuard configuration');
      return null;
    } finally {
      setWireGuardLoading(false);
    }
  }, [isConnected, account]);
  
  // Fonction pour activer WireGuard
  const enableWireGuard = useCallback(async () => {
    if (!isConnected || !account) {
      setWireGuardError('Wallet not connected');
      return false;
    }
    
    setWireGuardLoading(true);
    setWireGuardError(null);
    
    try {
      const response = await api.post(`${config.API_BASE_URL}/wireguard/enable`);
      
      if (response.data && response.data.success) {
        // Récupérer la nouvelle configuration
        await fetchWireGuardConfig();
        return true;
      } else {
        throw new Error(response.data?.message || 'Failed to enable WireGuard');
      }
    } catch (error: unknown) {
      console.error('Error enabling WireGuard:', error);
      setWireGuardError(error instanceof Error ? error.message : 'Failed to enable WireGuard');
      return false;
    } finally {
      setWireGuardLoading(false);
    }
  }, [isConnected, account, fetchWireGuardConfig]);
  
  // Fonction pour désactiver WireGuard
  const disableWireGuard = useCallback(async () => {
    if (!isConnected || !account) {
      setWireGuardError('Wallet not connected');
      return false;
    }
    
    setWireGuardLoading(true);
    setWireGuardError(null);
    
    try {
      const response = await api.post(`${config.API_BASE_URL}/wireguard/disable`);
      
      if (response.data && response.data.success) {
        // Mettre à jour le statut
        setWireGuardConfig(null);
        setStatus(prevStatus => ({
          ...prevStatus,
          wireGuardEnabled: false,
          wireGuardConfig: undefined,
          protocol: 'DHT'
        }));
        return true;
      } else {
        throw new Error(response.data?.message || 'Failed to disable WireGuard');
      }
    } catch (error: unknown) {
      console.error('Error disabling WireGuard:', error);
      setWireGuardError(error instanceof Error ? error.message : 'Failed to disable WireGuard');
      return false;
    } finally {
      setWireGuardLoading(false);
    }
  }, [isConnected, account]);
  
  // Fonction pour se connecter à un pair WireGuard
  const connectToWireGuardPeer = useCallback(async (peerPublicKey: string, endpoint: string) => {
    if (!isConnected || !account) {
      setWireGuardError('Wallet not connected');
      return false;
    }
    
    if (!wireGuardConfig) {
      setWireGuardError('WireGuard not configured');
      return false;
    }
    
    setWireGuardLoading(true);
    setWireGuardError(null);
    
    try {
      const response = await api.post(`${config.API_BASE_URL}/wireguard/connect`, {
        peerPublicKey,
        endpoint
      });
      
      if (response.data && response.data.success) {
        // Mettre à jour la configuration
        const updatedConfig = {
          ...wireGuardConfig,
          peerPublicKey,
          endpoint,
          status: 'active' as const,
          lastConnected: new Date().toISOString()
        };
        
        setWireGuardConfig(updatedConfig);
        setStatus(prevStatus => ({
          ...prevStatus,
          wireGuardConfig: updatedConfig
        }));
        
        return true;
      } else {
        throw new Error(response.data?.message || 'Failed to connect to WireGuard peer');
      }
    } catch (error: unknown) {
      console.error('Error connecting to WireGuard peer:', error);
      setWireGuardError(error instanceof Error ? error.message : 'Failed to connect to WireGuard peer');
      return false;
    } finally {
      setWireGuardLoading(false);
    }
  }, [isConnected, account, wireGuardConfig]);
  
  // Effet pour démarrer le polling lorsque le wallet est connecté
  useEffect(() => {
    // Fonction pour démarrer le polling
    const startPolling = () => {
      // Arrêter le polling existant si nécessaire
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      
      // Récupérer immédiatement le statut
      fetchDHTNodeStatus();
      
      // Configurer le polling toutes les 30 secondes
      pollingInterval.current = setInterval(() => {
        fetchDHTNodeStatus();
      }, 30000);
    };
    
    // Si le wallet est connecté, démarrer le polling
    if (isConnected && account) {
      startPolling();
      
      // Vérifier également la configuration WireGuard au démarrage
      fetchWireGuardConfig();
    } else {
      // Si le wallet est déconnecté, arrêter le polling et réinitialiser l'état
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      setStatus({
        active: false,
        nodeType: '',
        nodeId: '',
        nodeIp: '',
        connectedPeers: 0,
        storageUsed: 0,
        totalStorage: 0,
        uptime: 0,
        lastUpdated: '',
        protocol: '',
        wireGuardEnabled: false
      });
      
      setWireGuardConfig(null);
      setWireGuardPeers([]);
    }
    
    // Nettoyage lors du démontage du composant
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [isConnected, account, fetchDHTNodeStatus, fetchWireGuardConfig]);
  
  return {
    status,
    error,
    loading,
    fetchStatus: fetchDHTNodeStatus,
    
    // Fonctionnalités WireGuard
    wireGuard: {
      config: wireGuardConfig,
      peers: wireGuardPeers,
      loading: wireGuardLoading,
      error: wireGuardError,
      fetchConfig: fetchWireGuardConfig,
      enable: enableWireGuard,
      disable: disableWireGuard,
      connectToPeer: connectToWireGuardPeer
    }
  };
}
