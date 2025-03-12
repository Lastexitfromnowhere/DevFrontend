// src/hooks/useDHTNode.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useWalletContext } from '@/contexts/WalletContext';
import { config } from '@/config/env';

// Configuration de base d'Axios avec logs
const api = axios.create({
  timeout: config.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter l'adresse du wallet à toutes les requêtes
api.interceptors.request.use(
  (config) => {
    // Récupérer l'adresse du wallet depuis le localStorage
    const walletAddress = localStorage.getItem('walletAddress');
    
    // Si l'adresse existe, l'ajouter aux en-têtes
    if (walletAddress) {
      config.headers['X-Wallet-Address'] = walletAddress;
      config.headers['Authorization'] = `Bearer ${walletAddress}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Type pour le statut du nœud DHT
export type DHTNodeStatusType = {
  active: boolean;
  nodeId?: string;
  lastUpdated: string;
  nodeIp?: string | null;
  walletAddress?: string;
  nodeType?: 'HOST' | 'USER';
  connectedPeers?: number;
  storageUsed?: number;
  totalStorage?: number;
  uptime?: number;
  protocol?: string; // 'DHT' ou 'WireGuard'
  healthStatus?: 'healthy' | 'warning' | 'critical';
};

export function useDHTNode() {
  const { isConnected, account } = useWalletContext();
  
  // Récupérer l'état initial depuis le localStorage
  const getInitialState = (): DHTNodeStatusType => {
    if (typeof window === 'undefined') {
      return {
        active: false,
        lastUpdated: new Date().toISOString(),
        nodeIp: null,
        connectedPeers: 0,
        storageUsed: 0,
        totalStorage: 0
      };
    }
    
    const savedState = localStorage.getItem('dhtNodeStatus');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        // Forcer l'état à inactif au démarrage de l'application
        return {
          ...parsedState,
          active: false,
          nodeIp: null
        };
      } catch (e) {
        console.error('Error parsing saved DHT node state:', e);
      }
    }
    
    return {
      active: false,
      lastUpdated: new Date().toISOString(),
      nodeIp: null,
      connectedPeers: 0,
      storageUsed: 0,
      totalStorage: 0
    };
  };
  
  const [status, setStatus] = useState<DHTNodeStatusType>(getInitialState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ajouter des refs pour les tentatives de reconnexion
  const statusRetryCount = useRef(0);
  const maxRetryDelay = 60000; // 1 minute maximum entre les tentatives

  // Fonction pour récupérer le statut du nœud DHT
  const fetchDHTNodeStatus = useCallback(async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    try {
      // Vérifier si nous avons atteint le nombre maximum de tentatives
      if (statusRetryCount.current > 5) {
        console.warn('Nombre maximum de tentatives atteint, attente avant la prochaine vérification');
        statusRetryCount.current = 0; // Réinitialiser pour la prochaine fois
        setIsLoading(false);
        return;
      }

      const now = new Date();
      
      // Vérifier si nous avons vérifié récemment (dans les 15 secondes)
      const lastStatusCheck = localStorage.getItem('lastDHTStatusCheck');
      if (lastStatusCheck) {
        const lastCheck = new Date(lastStatusCheck);
        const timeSinceLastCheck = now.getTime() - lastCheck.getTime();
        
        // Si la dernière vérification date de moins de 15 secondes et que nous avons des données en cache
        if (timeSinceLastCheck < 15000) {
          const cachedStatus = localStorage.getItem('dhtNodeStatus');
          if (cachedStatus) {
            try {
              const parsedStatus = JSON.parse(cachedStatus);
              if (parsedStatus.walletAddress === account) {
                console.log('Utilisation du cache de statut DHT (moins de 15 secondes)', parsedStatus);
                setStatus(parsedStatus);
                setIsLoading(false);
                return;
              }
            } catch (e) {
              console.error('Error parsing saved DHT node state:', e);
            }
          }
        }
      }
      
      // Enregistrer le moment de cette vérification
      localStorage.setItem('lastDHTStatusCheck', now.toISOString());
      
      // Faire la requête API pour obtenir le statut du nœud DHT
      const response = await api.get(`${config.API_BASE_URL}/dht/status`);
      
      console.log('DHT Status response:', response.data);
      
      if (response.data.success) {
        const nodeData = response.data;
        
        // Mettre à jour l'état avec les données du serveur
        const updatedStatus: DHTNodeStatusType = {
          active: nodeData.active || false,
          nodeId: nodeData.nodeId || null,
          nodeIp: nodeData.nodeIp || null,
          walletAddress: account,
          lastUpdated: now.toISOString(),
          nodeType: nodeData.nodeType || 'USER',
          connectedPeers: nodeData.connectedPeers || 0,
          storageUsed: nodeData.storageUsed || 0,
          totalStorage: nodeData.totalStorage || 0,
          uptime: nodeData.uptime || 0,
          protocol: nodeData.protocol || 'DHT',
          healthStatus: nodeData.healthStatus || 'healthy'
        };
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('dhtNodeStatus', JSON.stringify(updatedStatus));
        
        // Mettre à jour l'état
        setStatus(updatedStatus);
        statusRetryCount.current = 0; // Réinitialiser le compteur de tentatives
      } else {
        throw new Error(nodeData.message || 'Failed to fetch DHT node status');
      }
    } catch (error) {
      console.error('Error fetching DHT node status:', error);
      statusRetryCount.current += 1;
      
      // Calculer un délai exponentiel pour la prochaine tentative
      const retryDelay = Math.min(1000 * Math.pow(2, statusRetryCount.current), maxRetryDelay);
      console.log(`Retrying in ${retryDelay}ms (attempt ${statusRetryCount.current})`);
      
      // Si l'erreur est liée à l'authentification, réinitialiser l'état
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setError('Authentication failed. Please reconnect your wallet.');
      } else {
        setError('Failed to fetch DHT node status. Retrying...');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, account]);

  // Effet pour récupérer le statut du nœud DHT au chargement et périodiquement
  useEffect(() => {
    if (isConnected && account) {
      // Récupérer le statut immédiatement
      fetchDHTNodeStatus();
      
      // Mettre en place une vérification périodique toutes les 30 secondes
      const intervalId = setInterval(() => {
        fetchDHTNodeStatus();
      }, 30000);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isConnected, account, fetchDHTNodeStatus]);

  return {
    status,
    isLoading,
    error,
    refreshStatus: fetchDHTNodeStatus
  };
}
