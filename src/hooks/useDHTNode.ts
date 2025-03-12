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
  };
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
    protocol: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
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
        protocol: ''
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
          protocol: nodeData?.protocol || 'DHT'
        };
        
        // Mettre en cache les données
        localStorage.setItem('dhtNodeStatus', JSON.stringify(updatedStatus));
        
        // Mettre à jour l'état
        setStatus(updatedStatus);
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
      if (axios.isAxiosError && axios.isAxiosError(error) && error.response && error.response.status === 401) {
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
        protocol: ''
      });
    }
    
    // Nettoyage lors du démontage du composant
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [isConnected, account, fetchDHTNodeStatus]);
  
  return {
    status,
    error,
    loading,
    fetchStatus: fetchDHTNodeStatus
  };
}
