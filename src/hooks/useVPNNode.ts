// src/hooks/useVPNNode.ts
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
      // S'assurer que headers existe avant d'y accéder
      if (!config.headers) {
        config.headers = {};
      }
      config.headers['X-Wallet-Address'] = walletAddress;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour ajouter l'authentification
api.interceptors.request.use(request => {
  console.log('Starting Request:', {
    url: request.url,
    method: request.method,
    data: request.data,
    headers: request.headers,
    baseURL: request.baseURL
  });
  
  // Récupérer le wallet depuis le contexte
  const walletAddress = localStorage.getItem('walletAddress');
  if (walletAddress) {
    // S'assurer que headers existe avant d'y accéder
    if (!request.headers) {
      request.headers = {};
    }
    request.headers['Authorization'] = `Bearer ${walletAddress}`;
  }
  
  return request;
}, error => {
  console.error('Request Error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(
  response => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  error => {
    console.error('Response Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      config: error.config
    });
    return Promise.reject(error);
  }
);

export type NodeStatusType = {
  active: boolean;
  bandwidth: number;
  earnings: number;
  connectedUsers: number;
  lastUpdated: string;
  nodeIp: string | null;
  walletAddress?: string;
  connectionQuality?: number;
  rewardTier?: string;
  healthStatus?: 'healthy' | 'warning' | 'critical';
  uptime?: number;
  connectedToNode?: string; // Adresse du wallet du nœud auquel l'utilisateur est connecté
  metrics?: {
    uptime: number;
    latency: number;
    packetLoss: number;
  };
  nodeType?: 'HOST' | 'USER';
  performance?: {
    bandwidth: number;
    latency: number;
    packetLoss: number;
  };
  status?: string; // Ajouter le champ status
  connectedClients?: Array<{
    connectionId?: string;
    walletAddress: string;
    ip?: string;
    connectedSince: string;
    lastActivity?: string;
  }>;
};

export function useVPNNode() {
  const { isConnected, account } = useWalletContext();
  
  // Récupérer l'état initial depuis le localStorage
  const getInitialState = (): NodeStatusType => {
    if (typeof window === 'undefined') {
      return {
        active: false,
        bandwidth: 0,
        earnings: 0,
        connectedUsers: 0,
        lastUpdated: new Date().toISOString(),
        nodeIp: null
      };
    }
    
    const savedState = localStorage.getItem('vpnNodeStatus');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        // Forcer l'état à inactif au démarrage de l'application
        return {
          ...parsedState,
          active: false,
          nodeIp: null,
          connectedToNode: null
        };
      } catch (e) {
        console.error('Error parsing saved VPN node state:', e);
      }
    }
    
    return {
      active: false,
      bandwidth: 0,
      earnings: 0,
      connectedUsers: 0,
      lastUpdated: new Date().toISOString().toString(),
      nodeIp: null
    };
  };
  
  const [status, setStatus] = useState<NodeStatusType>(getInitialState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableNodes, setAvailableNodes] = useState<any[]>([]);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);
  
  // Ajouter des refs pour les tentatives de reconnexion
  const statusRetryCount = useRef(0);
  const startRetryCount = useRef(0);
  const stopRetryCount = useRef(0);
  const maxRetryDelay = 60000; // 1 minute maximum entre les tentatives

  // Réinitialiser l'état après une erreur d'authentification
  const resetAuthState = useCallback(() => {
    localStorage.removeItem('vpnNodeStatus');
    localStorage.removeItem('walletAddress');
    setStatus(getInitialState());
    setError(null);
  }, []);

  // Tester la connexion au serveur
  const testConnection = async (): Promise<boolean> => {
    try {
      console.log('Testing server connection...');
      const response = await api.get(`${config.API_BASE_URL}/health`, {
        timeout: 10000 // 10 secondes
      });
      return (response.data as { status?: string }).status === 'healthy';
    } catch (error) {
      console.error('Server connection test failed:', error);
      return false;
    }
  };

  // Fonction pour récupérer le statut du nœud et les récompenses
  const fetchNodeStatus = useCallback(async () => {
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
      const lastStatusCheck = localStorage.getItem('lastStatusCheck');
      if (lastStatusCheck) {
        const lastCheck = new Date(lastStatusCheck);
        const timeSinceLastCheck = now.getTime() - lastCheck.getTime();
        
        // Si la dernière vérification date de moins de 15 secondes et que nous avons des données en cache
        if (timeSinceLastCheck < 15000) {
          const cachedStatus = localStorage.getItem('vpnNodeStatus');
          if (cachedStatus) {
            try {
              const parsedStatus = JSON.parse(cachedStatus);
              if (parsedStatus.walletAddress === account) {
                console.log('Utilisation du cache de statut (moins de 15 secondes)', parsedStatus);
                setStatus(parsedStatus);
                setIsLoading(false);
                return;
              }
            } catch (e) {
              console.error('Error parsing saved VPN node state:', e);
            }
          }
        }
      }
      
      // Enregistrer le moment de cette vérification
      localStorage.setItem('lastStatusCheck', now.toISOString());
      
      // Faire la requête API
      const response = await api.get(`${config.API_BASE_URL}/dht/status`, {
        headers: {
          'X-Wallet-Address': account
        }
      });
      
      console.log('Status response:', response.data);
      
      if ((response.data as { success?: boolean }).success) {
        const nodeData = response.data as {
          active?: boolean;
          status?: string;
          clientIP?: string;
          ip?: string;
          connectedUsers?: number;
          performance?: {
            bandwidth?: number;
            latency?: number;
            packetLoss?: number;
          };
          stats?: {
            uptime?: number;
            earnings?: number;
          };
          nodeType?: string;
          connectedClients?: Array<{
            connectionId?: string;
            walletAddress: string;
            ip?: string;
            connectedSince: string;
            lastActivity?: string;
          }>;
        };
        
        // Mettre à jour l'état avec les données du serveur
        const updatedStatus = {
          ...status,
          active: nodeData.active || false, // S'assurer que active est correctement défini
          status: nodeData.status || 'INACTIVE', // Ajouter le champ status
          nodeIp: nodeData.clientIP || nodeData.ip || null, // Utiliser l'adresse IP réelle du client
          connectedUsers: nodeData.connectedUsers || 0,
          bandwidth: nodeData.performance?.bandwidth || 0,
          uptime: nodeData.stats?.uptime || 0,
          earnings: nodeData.stats?.earnings || 0,
          lastUpdated: new Date().toISOString().toString(),
          // Préserver le type de nœud existant s'il est défini, sinon utiliser celui du serveur
          nodeType: (status.nodeType || nodeData.nodeType || 'USER') as 'HOST' | 'USER',
          performance: {
            bandwidth: nodeData.performance?.bandwidth || 0,
            latency: nodeData.performance?.latency || 0,
            packetLoss: nodeData.performance?.packetLoss || 0
          },
          // Ajouter les clients connectés s'ils existent
          connectedClients: nodeData.connectedClients || []
        };
        
        // Assurer la cohérence entre status et active
        if (updatedStatus.status === 'ACTIVE' && !updatedStatus.active) {
          console.log('Correcting inconsistency: status is ACTIVE but active is false');
          updatedStatus.active = true;
        } else if (updatedStatus.status === 'INACTIVE' && updatedStatus.active) {
          console.log('Correcting inconsistency: status is INACTIVE but active is true');
          updatedStatus.active = false;
        }
        
        // Mettre à jour l'état avec les informations de base
        setStatus(updatedStatus);
        
        // Sauvegarder l'état dans le localStorage avec l'adresse du wallet
        localStorage.setItem('vpnNodeStatus', JSON.stringify({
          ...updatedStatus,
          walletAddress: account
        }));
        
        setError(null);
      }
    } catch (error: any) {
      console.error('Failed to check node status:', error);
      if (error.response?.status === 401) {
        setError('Erreur d\'authentification. Veuillez vous reconnecter avec votre wallet.');
        localStorage.removeItem('walletAddress'); // Forcer la déconnexion
        resetAuthState();
      } else if (error.response?.status === 404) {
        setError('Service non trouvé. Le serveur est peut-être en cours de maintenance.');
      } else if (error.response?.status === 429) {
        console.warn('Rate limit atteint, utilisation des données en cache');
        
        // Utiliser les données en cache si disponibles et récentes (moins de 10 minutes)
        const cachedStatus = localStorage.getItem('vpnNodeStatus');
        if (cachedStatus) {
          try {
            const parsedStatus = JSON.parse(cachedStatus);
            const lastUpdated = new Date(parsedStatus.lastUpdated);
            const now = new Date();
            const timeSinceLastUpdate = now.getTime() - lastUpdated.getTime();
            
            if (timeSinceLastUpdate < 600000 && parsedStatus.walletAddress === account) {
              console.log('Utilisation des données en cache (moins de 10 minutes)', parsedStatus);
              setStatus(parsedStatus);
            }
          } catch (e) {
            console.error('Error parsing saved VPN node state:', e);
          }
        }
        
        // Programmer une nouvelle tentative avec un délai plus long
        const backoffDelay = Math.min(
          (Math.pow(2, statusRetryCount.current) * 5000) + (Math.random() * 5000), 
          maxRetryDelay
        );
        statusRetryCount.current += 1;
        console.log(`Nouvelle tentative dans ${Math.round(backoffDelay/1000)} secondes`);
        // Ne pas afficher d'erreur à l'utilisateur, juste attendre et réessayer
        setTimeout(fetchNodeStatus, backoffDelay);
      } else {
        setError((error.response?.data as { message?: string }).message || error.message || 'Erreur lors de la vérification du statut');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, account, status, statusRetryCount, maxRetryDelay, resetAuthState]);

  // Fonction pour récupérer les nœuds disponibles
  const fetchAvailableNodesFromHook = async (forceRefresh = false) => {
    try {
      // Vérifier si nous avons des données en cache et si elles sont encore valides
      const now = new Date();
      const lastUpdate = localStorage.getItem('lastNodesUpdate');
      const cacheTimeout = 30 * 1000; // Réduire à 30 secondes pour une mise à jour plus fréquente
      
      // Si ce n'est pas un rafraîchissement forcé, vérifier le cache
      if (!forceRefresh && lastUpdate) {
        const lastUpdateTime = new Date(lastUpdate);
        const timeDiff = now.getTime() - lastUpdateTime.getTime();
        
        // Si le cache est encore valide, utiliser les données en cache
        if (timeDiff < cacheTimeout) {
          const cachedNodes = localStorage.getItem('availableNodesCache');
          if (cachedNodes) {
            try {
              const parsedNodes = JSON.parse(cachedNodes);
              console.log('Utilisation du cache de nœuds (moins de 30 secondes)', parsedNodes);
              return parsedNodes;
            } catch (e) {
              console.error('Erreur lors de l\'analyse du cache de nœuds:', e);
            }
          }
        }
      }
      
      // Ajouter un délai aléatoire pour éviter le rate limiting
      const randomDelay = Math.floor(Math.random() * 300) + 50; // 50-350ms (réduit pour plus de réactivité)
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      
      // Faire la requête API avec l'adresse du wallet actuel
      const response = await api.get(`${config.API_BASE_URL}/dht/available-nodes`, {
        headers: {
          'X-Wallet-Address': account || localStorage.getItem('walletAddress') || ''
        }
      });
      
      if ((response.data as { success?: boolean }).success) {
        const nodes = (response.data as { nodes?: any[] }).nodes || [];
        console.log('Nœuds reçus du serveur:', nodes);
        
        // Filtrer les nœuds pour ne garder que ceux qui sont valides
        const validNodes = nodes.filter((node: any) => {
          // Vérifier que le nœud a une adresse wallet
          if (!node.walletAddress) {
            console.log('Nœud rejeté - pas d\'adresse wallet');
            return false;
          }
          
          // Vérifier que le nœud a été vu récemment (moins de 15 minutes)
          if (node.lastSeen) {
            const lastSeenDate = new Date(node.lastSeen);
            const diffMs = now.getTime() - lastSeenDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins >= 15) { // Réduire à 15 minutes pour plus de précision
              console.log(`Nœud rejeté - trop ancien (${diffMins} minutes):`, node.walletAddress);
              return false;
            }
          } else {
            console.log('Nœud rejeté - pas de lastSeen:', node.walletAddress);
            return false; // Rejeter les nœuds sans timestamp de dernière activité
          }
          
          // Ne pas afficher son propre nœud dans la liste des nœuds disponibles
          // si l'utilisateur est en mode hôte
          const isOwnNode = node.walletAddress === account;
          const isHostMode = localStorage.getItem('vpnNodeIsHost') === 'true';
          if (isOwnNode && isHostMode) {
            console.log('Nœud propre filtré de la liste des disponibles (mode hôte):', node.walletAddress);
            return false;
          }
          
          return true;
        });
        
        console.log('Nœuds valides après filtrage:', validNodes);
        
        // Ajouter un timestamp de dernière vérification à chaque nœud
        const nodesWithTimestamp = validNodes.map((node: any) => ({
          ...node,
          lastChecked: now.toISOString()
        }));
        
        // Mettre à jour le cache
        localStorage.setItem('availableNodesCache', JSON.stringify(nodesWithTimestamp));
        localStorage.setItem('lastNodesUpdate', now.toISOString());
        
        return nodesWithTimestamp;
      } else {
        throw new Error('Failed to fetch available nodes');
      }
    } catch (error: any) {
      console.error('Error fetching available nodes:', error);
      
      // En cas d'erreur 429 (Too Many Requests), utiliser les données en cache si disponibles
      if (error.response?.status === 429) {
        console.warn('Rate limit atteint, utilisation des données en cache');
        const cachedNodes = localStorage.getItem('availableNodesCache');
        if (cachedNodes) {
          try {
            return JSON.parse(cachedNodes);
          } catch (e) {
            console.error('Erreur lors de l\'analyse du cache de nœuds:', e);
          }
        }
      }
      
      // Si pas de cache ou erreur lors de l'analyse, retourner un tableau vide
      return [];
    }
  };

  // Fonction pour se connecter à un nœud spécifique
  const connectToNode = async (nodeWalletAddress: string) => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    try {
      // Vérifier si l'utilisateur est déjà connecté à un autre nœud
      if (status.active && status.connectedToNode && status.connectedToNode !== nodeWalletAddress) {
        console.log('Déjà connecté à un autre nœud. Déconnexion automatique...');
        // Déconnecter du nœud actuel avant de se connecter au nouveau
        const disconnectSuccess = await disconnectFromNode();
        if (!disconnectSuccess) {
          console.error('Échec de la déconnexion automatique');
          setError('Échec de la déconnexion du nœud actuel. Veuillez réessayer.');
          setIsLoading(false);
          return false;
        }
        console.log('Déconnexion réussie, connexion au nouveau nœud...');
      }

      const response = await api.post(`${config.API_BASE_URL}/connect`, {
        clientWalletAddress: account,
        hostWalletAddress: nodeWalletAddress
      });
      
      if ((response.data as { success?: boolean }).success) {
        // Mettre à jour le statut avec les informations du nœud
        const updatedStatus = {
          ...status,
          active: true,
          nodeIp: (response.data as { nodeIp?: string }).nodeIp || null,
          connectedToNode: nodeWalletAddress,
          lastUpdated: new Date().toISOString().toString()
        };
        
        // Mettre à jour l'état
        setStatus(updatedStatus);
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('vpnNodeStatus', JSON.stringify({
          ...updatedStatus,
          walletAddress: account
        }));
        
        console.log('Connexion réussie au nœud:', nodeWalletAddress);
        console.log('Statut mis à jour:', updatedStatus);
        
        setError(null);
        return true;
      } else {
        setError((response.data as { message?: string }).message || 'Failed to connect to node');
        return false;
      }
    } catch (error) {
      console.error('Error connecting to node:', error);
      setError((error as any).response?.data?.message || (error as any).message || 'Failed to connect to node');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const startNode = async (isHost = false) => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    try {
      const isServerUp = await testConnection();
      if (!isServerUp) {
        throw new Error('Le serveur VPN est actuellement indisponible. Veuillez réessayer plus tard.');
      }

      console.log('Starting node for wallet:', account);
      
      const response = await api.post(`${config.API_BASE_URL}/dht/connect`, {
        walletAddress: account,
        nodeInfo: {
          country: 'France',
          region: 'Île-de-France',
          coordinates: [48.8566, 2.3522]
        },
        isHost: isHost // Indiquer si l'utilisateur est un hébergeur ou un client
      });

      console.log('Start node response:', response.data);
      
      const responseData = response.data as {
        success?: boolean;
        ip?: string;
        bandwidth?: number;
      };
      
      if (responseData.success) {
        const newStatus = {
          ...status,
          active: true,
          nodeIp: responseData.ip || null,
          bandwidth: responseData.bandwidth || 0,
          lastUpdated: new Date().toISOString().toString(),
          walletAddress: account,
          nodeType: isHost ? 'HOST' as const : 'USER' as const // Utiliser 'as const' pour garantir le type exact
        };
        
        setStatus(newStatus);
        // Sauvegarder l'état dans le localStorage
        localStorage.setItem('vpnNodeStatus', JSON.stringify(newStatus));
        
        setError(null);
        // Réinitialiser le compteur de tentatives après un succès
        startRetryCount.current = 0;
      } else {
        throw new Error((responseData as { message?: string }).message || 'Failed to start node');
      }
    } catch (error: any) {
      console.error('Failed to start node:', error);
      if (error.response?.status === 401) {
        setError('Erreur d\'authentification. Veuillez vous reconnecter avec votre wallet.');
        localStorage.removeItem('vpnNodeStatus'); // Supprimer l'état sauvegardé
        localStorage.removeItem('walletAddress'); // Forcer la déconnexion
        resetAuthState();
      } else if (error.response?.status === 404) {
        setError('Service non trouvé. Le serveur est peut-être en cours de maintenance.');
      } else if (error.response?.status === 429) {
        console.warn('Rate limit atteint, nouvelle tentative avec backoff exponentiel');
        // Utiliser un backoff exponentiel pour les nouvelles tentatives
        const backoffDelay = Math.min(
          (Math.pow(2, startRetryCount.current) * 1000) + (Math.random() * 1000), 
          maxRetryDelay
        );
        startRetryCount.current += 1;
        console.log(`Nouvelle tentative dans ${Math.round(backoffDelay/1000)} secondes`);
        // Ne pas afficher d'erreur à l'utilisateur, juste attendre et réessayer
        setTimeout(startNode, backoffDelay);
      } else {
        setError((error.response?.data as { message?: string }).message || error.message || 'Erreur lors du démarrage du nœud');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopNode = async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    try {
      const isServerUp = await testConnection();
      if (!isServerUp) {
        throw new Error('Le serveur VPN est actuellement indisponible. Veuillez réessayer plus tard.');
      }

      console.log('Stopping node for wallet:', account);
      
      const response = await api.post(`${config.API_BASE_URL}/dht/disconnect`, {
        walletAddress: account
      });

      console.log('Stop node response:', response.data);
      
      if ((response.data as { success?: boolean }).success) {
        // Préserver le type de nœud pour pouvoir le restaurer plus tard
        const currentNodeType = status.nodeType;
        
        const newStatus = {
          ...status,
          active: false,
          lastUpdated: new Date().toISOString().toString(),
          // Conserver le type de nœud même après l'arrêt
          nodeType: currentNodeType
        };
        
        setStatus(newStatus);
        // Sauvegarder l'état dans le localStorage
        localStorage.setItem('vpnNodeStatus', JSON.stringify(newStatus));
        
        setError(null);
        // Réinitialiser le compteur de tentatives après un succès
        stopRetryCount.current = 0;
        return true;
      } else {
        setError((response.data as { message?: string }).message || 'Failed to stop node');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to stop node:', error);
      if (error.response?.status === 401) {
        setError('Erreur d\'authentification. Veuillez vous reconnecter avec votre wallet.');
        localStorage.removeItem('vpnNodeStatus'); // Supprimer l'état sauvegardé
        localStorage.removeItem('walletAddress'); // Forcer la déconnexion
        resetAuthState();
      } else if (error.response?.status === 404) {
        setError('Service non trouvé. Le serveur est peut-être en cours de maintenance.');
      } else if (error.response?.status === 429) {
        console.warn('Rate limit atteint, nouvelle tentative avec backoff exponentiel');
        // Utiliser un backoff exponentiel pour les nouvelles tentatives
        const backoffDelay = Math.min(
          (Math.pow(2, stopRetryCount.current) * 1000) + (Math.random() * 1000), 
          maxRetryDelay
        );
        stopRetryCount.current += 1;
        console.log(`Nouvelle tentative dans ${Math.round(backoffDelay/1000)} secondes`);
        // Ne pas afficher d'erreur à l'utilisateur, juste attendre et réessayer
        setTimeout(stopNode, backoffDelay);
      } else {
        setError((error.response?.data as { message?: string }).message || error.message || 'Erreur lors de l\'arrêt du nœud');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectFromNode = async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    try {
      const isServerUp = await testConnection();
      if (!isServerUp) {
        throw new Error('The VPN server is currently unavailable. Please try again later.');
      }

      console.log('Disconnecting client from node for wallet:', account);
      
      const response = await api.post(`${config.API_BASE_URL}/dht/client-disconnect`, {
        clientWalletAddress: account
      });

      console.log('Disconnect client response:', response.data);
      
      if ((response.data as { success?: boolean }).success) {
        // Update status to inactive for client
        const newStatus = {
          ...status,
          active: false,
          connectedToNode: undefined,
          nodeIp: null,
          lastUpdated: new Date().toISOString().toString()
        };
        
        setStatus(newStatus);
        
        // Update localStorage
        localStorage.setItem('vpnNodeStatus', JSON.stringify(newStatus));
        
        // Force status update from server after a short delay
        setTimeout(() => {
          fetchNodeStatus();
        }, 1000);
        
        setError(null);
        return true;
      } else {
        setError((response.data as { message?: string }).message || 'Failed to disconnect from node');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to disconnect from node:', error);
      if (error.response?.status === 401) {
        setError('Authentication error. Please reconnect with your wallet.');
      } else if (error.response?.status === 404) {
        setError('Service not found. The server may be under maintenance.');
      } else if (error.response?.status === 429) {
        console.warn('Rate limit reached, using cached data');
        // Use cached data if available
        const cachedStatus = localStorage.getItem('vpnNodeStatus');
        if (cachedStatus) {
          try {
            const parsedStatus = JSON.parse(cachedStatus);
            setStatus({
              ...parsedStatus,
              active: false,
              connectedToNode: undefined
            });
            return true;
          } catch (e) {
            console.error('Error parsing cached status:', e);
          }
        }
      } else {
        setError((error.response?.data as { message?: string }).message || error.message || 'Error disconnecting from node');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour récupérer les clients connectés à un nœud hôte
  const fetchConnectedClients = async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return [];
    }

    setIsLoading(true);
    try {
      const response = await api.get(`${config.API_BASE_URL}/dht/connected-clients`, {
        headers: {
          'X-Wallet-Address': account
        }
      });
      
      if ((response.data as { success?: boolean }).success) {
        const responseData = response.data as {
          success?: boolean;
          connectedClients?: any[];
          totalConnections?: number;
        };
        
        // Mettre à jour l'état avec les clients connectés
        setStatus(prevStatus => ({
          ...prevStatus,
          connectedClients: responseData.connectedClients || [],
          connectedUsers: responseData.totalConnections || 0
        }));
        
        return responseData.connectedClients || [];
      } else {
        throw new Error((response.data as { message?: string }).message || 'Failed to fetch connected clients');
      }
    } catch (error: any) {
      console.error('Error fetching connected clients:', error);
      setError((error.response?.data as { message?: string }).message || error.message || 'Error fetching connected clients');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour déconnecter un client spécifique (pour les hôtes)
  const disconnectClient = async (clientWalletAddress: string): Promise<boolean> => {
    if (!account) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    try {
      const response = await api.post(`${config.API_BASE_URL}/dht/disconnect-client`, {
        hostWalletAddress: account,
        clientWalletAddress: clientWalletAddress
      });
      
      const responseData = response.data as { success?: boolean };
      
      if (responseData.success) {
        // Mettre à jour l'état en retirant le client déconnecté
        setStatus(prevStatus => {
          const updatedClients = (prevStatus.connectedClients || [])
            .filter(client => client.walletAddress !== clientWalletAddress);
          
          return {
            ...prevStatus,
            connectedClients: updatedClients,
            connectedUsers: (prevStatus.connectedUsers || 1) - 1
          };
        });
        
        return true;
      } else {
        setError((responseData as { message?: string }).message || 'Failed to disconnect client');
        return false;
      }
    } catch (error: any) {
      console.error('Error disconnecting client:', error);
      setError((error.response?.data as { message?: string }).message || error.message || 'Error disconnecting client');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier l'état initial du nœud au chargement avec un délai
  useEffect(() => {
    if (isConnected && account) {
      // Sauvegarder l'adresse du wallet immédiatement après la connexion
      localStorage.setItem('walletAddress', account);
      
      // Vérifier si l'état sauvegardé correspond à ce compte
      const savedState = localStorage.getItem('vpnNodeStatus');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.walletAddress === account) {
            // Si l'état sauvegardé correspond à ce compte, l'utiliser temporairement
            setStatus(parsedState);
          }
        } catch (e) {
          console.error('Error parsing saved VPN node state:', e);
        }
      }
      
      // Toujours vérifier l'état réel du nœud au démarrage
      console.log('Vérification de l\'état du nœud au démarrage');
      const timer = setTimeout(() => {
        fetchNodeStatus();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // Nettoyer l'adresse du wallet si déconnecté
      localStorage.removeItem('walletAddress');
      
      // Réinitialiser l'état si déconnecté
      setStatus({
        active: false,
        bandwidth: 0,
        earnings: 0,
        connectedUsers: 0,
        lastUpdated: new Date().toISOString().toString(),
        nodeIp: null
      });
    }
  }, [isConnected, account]);

  // Vérifier périodiquement l'état du nœud s'il est actif
  useEffect(() => {
    if (isConnected && account) {
      fetchNodeStatus();
      
      const interval = setInterval(() => {
        fetchNodeStatus();
      }, 30000); // Vérifier toutes les 30 secondes
      
      return () => clearInterval(interval);
    }
  }, [isConnected, account, fetchNodeStatus]);

  // Mettre à jour les statistiques périodiquement
  useEffect(() => {
    if (status.active && status.nodeType) {
      const interval = setInterval(() => {
        // Pour le moment, nous n'avons pas de fonction fetchNodeStats
        // Si nécessaire, nous pouvons l'implémenter plus tard
      }, 60000); // Mettre à jour les statistiques toutes les minutes
      
      return () => clearInterval(interval);
    }
  }, [status.active, status.nodeType]);

  const fetchAvailableNodes = async (forceRefresh: boolean = false): Promise<any[]> => {
    const now = new Date();
    console.log('Début fetchAvailableNodes, forceRefresh:', forceRefresh);
    
    // Vérifier le cache si on ne force pas le rafraîchissement
    if (!forceRefresh) {
      const lastUpdate = localStorage.getItem('lastNodesUpdate');
      const cachedNodes = localStorage.getItem('availableNodesCache');
      
      if (lastUpdate && cachedNodes) {
        try {
          const lastUpdateDate = new Date(lastUpdate);
          const diffMs = now.getTime() - lastUpdateDate.getTime();
          const diffSecs = Math.floor(diffMs / 1000);
          
          // Utiliser le cache si la dernière mise à jour est récente (moins de 30 secondes)
          if (diffSecs < 30) {
            try {
              const parsedNodes = JSON.parse(cachedNodes);
              console.log('Utilisation du cache de nœuds (moins de 30 secondes)', parsedNodes);
              return parsedNodes;
            } catch (e) {
              console.error('Erreur lors de l\'analyse du cache de nœuds:', e);
            }
          }
        } catch (error) {
          console.error('Erreur lors de la vérification du cache:', error);
        }
      }
    }
    
    // Ajouter un délai aléatoire pour éviter le rate limiting
    const randomDelay = Math.floor(Math.random() * 300) + 50; // 50-350ms (réduit pour plus de réactivité)
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    try {
      console.log('Envoi de la requête API pour les nœuds disponibles');
      // Faire la requête API avec l'adresse du wallet actuel
      const response = await api.get(`${config.API_BASE_URL}/dht/available-nodes`, {
        headers: {
          'X-Wallet-Address': account || localStorage.getItem('walletAddress') || ''
        }
      });
      
      if ((response.data as { success?: boolean }).success) {
        const nodes = (response.data as { nodes?: any[] }).nodes || [];
        console.log('Nœuds reçus du serveur (non filtrés):', nodes);
        
        // Filtrer les nœuds pour ne garder que ceux qui sont valides
        const validNodes = nodes.filter((node: any) => {
          // Vérifier que le nœud a une adresse wallet
          if (!node.walletAddress) {
            console.log('Nœud rejeté - pas d\'adresse wallet');
            return false;
          }
          
          // Ajouter des logs détaillés pour chaque nœud
          console.log(`Analyse du nœud: ${node.walletAddress.substring(0, 10)}... - Status: ${node.status}, Active: ${node.active}, LastSeen: ${node.lastSeen ? new Date(node.lastSeen).toISOString() : 'N/A'}`);
          
          // Ne pas afficher son propre nœud dans la liste des nœuds disponibles
          // si l'utilisateur est en mode hôte
          const isOwnNode = node.walletAddress === account;
          const isHostMode = localStorage.getItem('vpnNodeIsHost') === 'true';
          if (isOwnNode && isHostMode) {
            console.log('Nœud propre filtré de la liste des disponibles (mode hôte):', node.walletAddress);
            return false;
          }
          
          // Vérifier que le nœud a été vu récemment (moins de 30 minutes)
          if (node.lastSeen) {
            const lastSeenDate = new Date(node.lastSeen);
            const diffMs = now.getTime() - lastSeenDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            
            // Accepter les nœuds vus dans les 30 dernières minutes, même s'ils sont INACTIVE
            if (diffMins >= 30) {
              console.log(`Nœud rejeté - trop ancien (${diffMins} minutes):`, node.walletAddress);
              return false;
            } else {
              console.log(`Nœud accepté - vu récemment (${diffMins} minutes):`, node.walletAddress);
              return true;
            }
          } else {
            console.log('Nœud rejeté - pas de lastSeen:', node.walletAddress);
            return false; // Rejeter les nœuds sans timestamp de dernière activité
          }
        });
        
        console.log('Nœuds valides après filtrage:', validNodes);
        
        // Ajouter un timestamp de dernière vérification à chaque nœud
        const nodesWithTimestamp = validNodes.map((node: any) => ({
          ...node,
          lastChecked: now.toISOString()
        }));
        
        // Mettre à jour le cache
        localStorage.setItem('availableNodesCache', JSON.stringify(nodesWithTimestamp));
        localStorage.setItem('lastNodesUpdate', now.toISOString());
        
        return nodesWithTimestamp;
      } else {
        throw new Error('Failed to fetch available nodes');
      }
    } catch (error: any) {
      console.error('Error fetching available nodes:', error);
      
      // En cas d'erreur 429 (Too Many Requests), utiliser les données en cache si disponibles
      if (error.response?.status === 429) {
        console.warn('Rate limit atteint, utilisation des données en cache');
        const cachedNodes = localStorage.getItem('availableNodesCache');
        if (cachedNodes) {
          try {
            return JSON.parse(cachedNodes);
          } catch (e) {
            console.error('Erreur lors de l\'analyse du cache de nœuds:', e);
          }
        }
      }
      
      // Si pas de cache ou erreur lors de l'analyse, retourner un tableau vide
      return [];
    }
  };

  return {
    status,
    isLoading,
    error,
    startNode,
    stopNode,
    fetchNodeStatus,
    testConnection,
    resetAuthState,
    availableNodes,
    isLoadingNodes,
    fetchAvailableNodes,
    connectToNode,
    disconnectFromNode,
    fetchConnectedClients,
    disconnectClient
  };
}
