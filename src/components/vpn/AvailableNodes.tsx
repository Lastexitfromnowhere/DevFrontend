import React, { useEffect, useState } from 'react';
import { useVPNNode } from '@/hooks/useVPNNode';
import { Card } from '../ui/Card';
import { TerminalButton as Button } from '../ui/terminal/TerminalButton';
import { Wifi, Server, Activity, RefreshCw, AlertTriangle, Users, Globe, Award } from 'lucide-react';
import { Spinner } from '../ui/Spinner';

// Définir l'interface pour un nœud VPN
interface VPNNode {
  walletAddress?: string;
  ip?: string;
  location?: {
    country?: string;
    region?: string;
  };
  performance?: {
    bandwidth?: number;
    latency?: number;
  };
  connectedUsers?: number;
  lastSeen?: string;
  score?: number;
  lastChecked?: string;
  status?: string;
}

// Interface pour les props du composant
interface AvailableNodesProps {
  onSelectNode?: (nodeId: string) => void;
}

// Fonction pour formater la date relative
const formatRelativeTime = (dateString: string | undefined): string => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown';
  }
};

export default function AvailableNodes({ onSelectNode }: AvailableNodesProps) {
  // Utiliser le hook useVPNNode pour accéder aux fonctions et états
  const { 
    connectToNode,
    isLoading,
    error 
  } = useVPNNode();
  
  const [availableNodes, setAvailableNodes] = useState<VPNNode[]>([]);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [localNodes, setLocalNodes] = useState<VPNNode[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fonction pour récupérer les nœuds disponibles
  const fetchAvailableNodes = async (forceRefresh: boolean = false): Promise<VPNNode[]> => {
    setIsRefreshing(true);
    try {
      // Vérifier si nous avons des données en cache et si elles sont encore valides
      const now = new Date();
      const lastUpdate = localStorage.getItem('lastNodesUpdate');
      const cacheTimeout = 60 * 1000; // 1 minute (selon la stratégie de mise en cache)
      
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
              console.log('Utilisation du cache de nœuds (moins de 1 minute)');
              setAvailableNodes(parsedNodes);
              return parsedNodes;
            } catch (e) {
              console.error('Erreur lors de l\'analyse du cache de nœuds:', e);
            }
          }
        }
      }
      
      // Ajouter un délai aléatoire pour éviter le rate limiting
      const randomDelay = Math.floor(Math.random() * 500) + 100; // 100-600ms
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      
      // Appeler directement l'API pour récupérer les nœuds
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/available-nodes`, {
        headers: {
          'X-Wallet-Address': localStorage.getItem('walletAddress') || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des nœuds: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        const nodes = data.nodes || [];
        console.log('Nœuds reçus du serveur:', nodes);
        
        // Filtrer les nœuds pour ne garder que ceux qui sont valides
        const validNodes = nodes.filter((node: VPNNode) => {
          // Vérifier que le nœud a une adresse wallet
          if (!node.walletAddress || !node.walletAddress.startsWith('B')) {
            console.log('Nœud rejeté - adresse wallet invalide:', node.walletAddress);
            return false;
          }
          
          // Vérifier que le nœud a été vu récemment (moins de 30 minutes)
          if (node.lastSeen) {
            const lastSeenDate = new Date(node.lastSeen);
            const diffMs = now.getTime() - lastSeenDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins >= 30) {
              console.log(`Nœud rejeté - trop ancien (${diffMins} minutes):`, node.walletAddress);
              return false;
            }
          } else {
            console.log('Nœud rejeté - pas de lastSeen:', node.walletAddress);
            return false; // Rejeter les nœuds sans timestamp de dernière activité
          }
          
          return true;
        });
        
        console.log('Nœuds valides après filtrage:', validNodes);
        
        // Mettre à jour le cache
        localStorage.setItem('availableNodesCache', JSON.stringify(validNodes));
        localStorage.setItem('lastNodesUpdate', now.toISOString());
        
        // Mettre à jour l'état avec les nœuds valides
        setAvailableNodes(validNodes);
        return validNodes;
      } else {
        throw new Error(data.message || 'Échec de la récupération des nœuds disponibles');
      }
    } catch (error) {
      console.error('Error fetching available nodes:', error);
      
      // En cas d'erreur, essayer d'utiliser le cache
      const cachedNodes = localStorage.getItem('availableNodesCache');
      if (cachedNodes) {
        try {
          const parsedNodes = JSON.parse(cachedNodes);
          setAvailableNodes(parsedNodes);
          return parsedNodes;
        } catch (e) {
          console.error('Erreur lors de l\'analyse du cache de nœuds:', e);
        }
      }
      return [];
    } finally {
      setIsRefreshing(false);
    }
  };

  // Charger les nœuds disponibles au chargement du composant
  useEffect(() => {
    fetchAvailableNodes(true); // Forcer le rafraîchissement
    
    // Configurer un intervalle pour rafraîchir les nœuds disponibles toutes les 2 minutes
    const interval = setInterval(() => {
      console.log('Rafraîchissement automatique des nœuds disponibles');
      fetchAvailableNodes();
    }, 2 * 60 * 1000); // 2 minutes
    
    return () => clearInterval(interval);
  }, []);
  
  // Fonction pour rafraîchir manuellement les nœuds disponibles
  const handleRefresh = () => {
    // Forcer le rafraîchissement sans vérifier le délai
    console.log('Rafraîchissement manuel des nœuds disponibles');
    setIsRefreshing(true);
    
    // Appeler fetchAvailableNodes avec forceRefresh=true pour ignorer le cache
    fetchAvailableNodes(true)
      .then(() => {
        console.log('Nœuds disponibles rafraîchis avec succès');
      })
      .catch(error => {
        console.error('Erreur lors du rafraîchissement des nœuds:', error);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  };
  
  // Mettre à jour les nœuds locaux uniquement lorsque les nœuds disponibles changent
  // et que nous ne sommes pas en train de charger
  useEffect(() => {
    if (!isLoadingNodes && availableNodes) {
      setLocalNodes(availableNodes);
    }
  }, [availableNodes, isLoadingNodes]);
  
  // Formater le score en pourcentage
  const formatScore = (score: number | undefined): string => {
    if (score === undefined) return 'N/A';
    return `${Math.round(score * 100)}%`;
  };
  
  // Fonction pour se connecter à un nœud
  const handleConnect = async (walletAddress: string | undefined) => {
    if (!walletAddress) {
      setErrorState('Invalid node selected');
      return;
    }
    
    setSelectedNode(walletAddress);
    setErrorState(null);
    
    try {
      const success = await connectToNode(walletAddress);
      if (success) {
        if (onSelectNode) {
          onSelectNode(walletAddress);
        }
      } else {
        setErrorState('Failed to connect to node. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting to node:', error);
      setErrorState('Error connecting to node. Please try again.');
    } finally {
      setSelectedNode(null);
    }
  };
  
  return (
    <Card className="mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Available VPN Nodes</h3>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          className="text-xs px-2 py-1 flex items-center"
          loading={isRefreshing}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>
      
      {errorState && (
        <div className="bg-red-900/20 border border-red-900/50 text-red-500 p-2 mb-4 rounded text-sm flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{errorState}</span>
        </div>
      )}
      
      {isLoadingNodes && !localNodes.length ? (
        <div className="flex justify-center items-center py-8">
          <Spinner className="w-8 h-8 border-4 rounded-full text-gray-600" />
          <span className="ml-2">Loading available nodes...</span>
        </div>
      ) : localNodes.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Server className="w-8 h-8 mx-auto mb-2" />
          <p>No VPN nodes available at the moment.</p>
          <p className="text-xs mt-2">Try refreshing or check back later.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {localNodes.map((node, index) => (
            <div
              key={`${node.walletAddress || ''}-${index}`}
              className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center mb-1">
                    {node.status === 'ACTIVE' ? (
                      <Wifi className="w-4 h-4 mr-1 text-green-400" />
                    ) : (
                      <Wifi className="w-4 h-4 mr-1 text-yellow-400" />
                    )}
                    <span className="font-medium truncate" title={node.walletAddress || ''}>
                      {node.walletAddress && node.walletAddress.length > 14 
                        ? `${node.walletAddress.substring(0, 8)}...${node.walletAddress.substring(node.walletAddress.length - 6)}`
                        : node.walletAddress || 'Unknown'}
                    </span>
                    {node.status !== 'ACTIVE' && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 rounded-sm">
                        Récemment actif
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-gray-300">
                    <div className="flex items-center text-xs text-gray-400">
                      <Globe className="w-3 h-3 mr-1 text-blue-400" />
                      <span>{node.location?.country || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <Activity className="w-3 h-3 mr-1 text-blue-400" />
                      <span>
                        {node.performance?.latency !== undefined 
                          ? `${node.performance.latency} ms` 
                          : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <Users className="w-3 h-3 mr-1" />
                      <span>Users: {node.connectedUsers || 0}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <Award className="w-3 h-3 mr-1" />
                      <span>Score: {formatScore(node.score)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Button
                    variant="primary"
                    onClick={() => handleConnect(node.walletAddress)}
                    loading={isLoading && selectedNode === node.walletAddress}
                    disabled={isLoading}
                    className="text-xs px-2 py-1"
                  >
                    {node.status === 'ACTIVE' ? 'Connect' : 'Réactiver'}
                  </Button>
                  <div className="text-xs text-gray-500 mt-1">
                    Last seen: {formatRelativeTime(node.lastSeen)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Status: <span className={node.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}>
                      {node.status === 'ACTIVE' ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoadingNodes && localNodes.length > 0 && (
            <div className="text-center py-2 text-gray-400">
              <Spinner className="w-4 h-4 border-2 rounded-full text-gray-600 mx-auto" />
              <p className="text-xs mt-1">Updating...</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
