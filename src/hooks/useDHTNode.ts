// src/hooks/useDHTNode.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useWalletContext } from '@/contexts/WalletContext';
import { config } from '@/config/env';
import * as dhtUtils from '@/utils/dhtUtils'; // Corriger l'importation

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
  // Champs obligatoires selon le backend
  serverIp: string;
  serverPublicKey: string;
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
  baseURL: config.API_BASE_URL,
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

// Fonction pour obtenir l'adresse IP locale
const getLocalIpAddress = async (): Promise<string> => {
  try {
    // Essayer de récupérer l'adresse IP depuis le localStorage
    const storedIp = localStorage.getItem('wireguard_server_ip');
    if (storedIp) {
      return storedIp;
    }
    
    // Si pas d'IP stockée, utiliser une valeur par défaut
    const defaultIp = '10.8.0.1';
    localStorage.setItem('wireguard_server_ip', defaultIp);
    return defaultIp;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'adresse IP locale:', error);
    return '10.8.0.1'; // Valeur par défaut en cas d'erreur
  }
};

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
  
  // Fonction pour récupérer le statut du nœud DHT
  const fetchStatus = useCallback(async (forceRefresh = false) => {
    if (!isConnected || !account) return;

    // Si nous ne forçons pas le rafraîchissement et que nous avons un cache récent
    const now = Date.now();
    const cacheKey = `dht-status-${account}`;
    
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!forceRefresh && cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        if (now - timestamp < 30000) { // 30 secondes
          setStatus(data);
          return;
        }
      } catch (e) {
        console.error('Erreur lors de la lecture du cache:', e);
        // En cas d'erreur de parsing, continuer avec la récupération depuis l'API
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Utiliser la fonction getDHTStatusByWallet qui utilise le bon format d'URL
      console.log('Récupération du statut DHT pour le wallet:', account);
      const data = await dhtUtils.getDHTStatusByWallet(account);
      
      if (data.success === false) {
        if (data.error) {
          throw new Error(data.error);
        }
        // Si pas d'erreur spécifique mais succès = false, définir un statut inactif
        setStatus({ active: false });
        // Mettre à jour le cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: { active: false },
          timestamp: now
        }));
        setLoading(false);
        return;
      }
      
      // Mettre à jour l'état
      setStatus(data);
      
      // Mettre à jour le cache
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: now
      }));
    } catch (err) {
      console.error('Failed to check node status:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
      // Type assertion pour response.data
      const response = await api.post('/dht/wireguard-publish', {
        walletAddress: account
      });
      const responseData = response.data as any;
      
      if (response.data && (response.data as { success?: boolean }).success) {
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
        const errorMessage = (response.data as { message?: string })?.message || 'Failed to fetch WireGuard configuration';
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
      // Récupérer l'adresse IP locale pour serverIp
      const serverIp = await getLocalIpAddress();
      
      // Générer une paire de clés WireGuard si nécessaire
      let serverPublicKey = localStorage.getItem('wireguard_server_public_key');
      if (!serverPublicKey) {
        // Utiliser une clé de démonstration si nous ne pouvons pas en générer une
        serverPublicKey = 'mPxEu7wjxMmKI3tWzBnEp8/Hs/MUhQEY6S7Iee+NGFI=';
        localStorage.setItem('wireguard_server_public_key', serverPublicKey);
      }
      
      console.log('Activation de WireGuard avec serverIp:', serverIp, 'et serverPublicKey:', serverPublicKey);
      
      const response = await api.post('/dht/wireguard-publish', {
        ip: serverIp,
        publicKey: serverPublicKey,
        walletAddress: account
      });
      
      if (response.data && (response.data as { success?: boolean }).success) {
        // Récupérer la nouvelle configuration
        await fetchWireGuardConfig();
        return true;
      } else {
        throw new Error((response.data as { message?: string })?.message || 'Failed to enable WireGuard');
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
      const response = await api.post('/dht/stop');
      
      if (response.data && (response.data as { success?: boolean }).success) {
        // Réinitialiser la configuration
        setWireGuardConfig(null);
        
        // Mettre à jour le statut
        setStatus(prevStatus => ({
          ...prevStatus,
          wireGuardEnabled: false,
          wireGuardConfig: undefined,
          protocol: 'DHT'
        }));
        
        return true;
      } else {
        throw new Error((response.data as { message?: string })?.message || 'Failed to disable WireGuard');
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
      // S'assurer que serverIp et serverPublicKey sont disponibles
      const serverIp = wireGuardConfig.serverIp || await getLocalIpAddress();
      const serverPublicKey = wireGuardConfig.serverPublicKey || localStorage.getItem('wireguard_server_public_key') || 'mPxEu7wjxMmKI3tWzBnEp8/Hs/MUhQEY6S7Iee+NGFI=';
      
      console.log('Connexion à WireGuard avec serverIp:', serverIp, 'et serverPublicKey:', serverPublicKey);
      
      const response = await api.post('/api/connect-to-node', {
        hostWalletAddress: account,
        peerPublicKey,
        endpoint,
        serverIp
      });
      
      if (response.data && (response.data as { success?: boolean }).success) {
        // Mettre à jour la configuration
        const updatedConfig = {
          ...wireGuardConfig,
          peerPublicKey,
          endpoint,
          status: 'active' as const,
          lastConnected: new Date().toISOString(),
          serverIp,
          serverPublicKey
        };
        
        setWireGuardConfig(updatedConfig);
        setStatus(prevStatus => ({
          ...prevStatus,
          wireGuardConfig: updatedConfig
        }));
        
        return true;
      } else {
        throw new Error((response.data as { message?: string })?.message || 'Failed to connect to WireGuard peer');
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
      fetchStatus();
      
      // Configurer le polling toutes les 30 secondes
      pollingInterval.current = setInterval(() => {
        fetchStatus();
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
  }, [isConnected, account, fetchStatus, fetchWireGuardConfig]);
  
  return {
    status,
    error,
    loading,
    fetchStatus,
    
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
