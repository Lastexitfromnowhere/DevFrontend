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
    disconnectFromNode,
    isLoading,
    error,
    fetchAvailableNodesFromHook,
    status
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
      // Utiliser directement la fonction du hook useVPNNode pour récupérer les nœuds
      // Cette approche garantit la cohérence entre les différentes parties de l'application
      const nodes = await fetchAvailableNodesFromHook(forceRefresh);
      console.log('Nœuds récupérés dans AvailableNodes:', nodes);
      setAvailableNodes(nodes);
      return nodes;
    } catch (error) {
      console.error('Error fetching available nodes:', error);
      setErrorState('Impossible de récupérer les nœuds disponibles. Veuillez réessayer.');
      
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
  
  // Fonction pour formater le score
  const formatScore = (score?: number): string => {
    if (score === undefined) return 'N/A';
    return score.toFixed(1);
  };
  
  // Fonction pour rafraîchir les nœuds disponibles
  const handleRefresh = () => {
    fetchAvailableNodes(true);
  };
  
  // Effet pour charger les nœuds disponibles au chargement du composant
  useEffect(() => {
    setIsLoadingNodes(true);
    
    // Ajouter un log pour voir le statut actuel
    console.log('Status actuel au chargement:', status);
    
    fetchAvailableNodes()
      .then(nodes => {
        setLocalNodes(nodes);
        setIsLoadingNodes(false);
      })
      .catch(error => {
        console.error('Error in initial node fetch:', error);
        setIsLoadingNodes(false);
      });
      
    // Mettre en place un intervalle pour rafraîchir les nœuds toutes les 30 secondes
    const intervalId = setInterval(() => {
      fetchAvailableNodes();
      // Ajouter un log pour voir le statut à chaque rafraîchissement
      console.log('Status à l\'intervalle de rafraîchissement:', status);
    }, 30000);
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(intervalId);
  }, []);
  
  // Fonction pour gérer la connexion à un nœud
  const handleConnect = async (walletAddress?: string) => {
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

  // Fonction pour gérer la déconnexion d'un nœud
  const handleDisconnect = async () => {
    setErrorState(null);
    
    try {
      const success = await disconnectFromNode();
      if (success) {
        // Rafraîchir la liste des nœuds après la déconnexion
        fetchAvailableNodes(true);
      } else {
        setErrorState('Failed to disconnect from node. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting from node:', error);
      setErrorState('Error disconnecting from node. Please try again.');
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
          {localNodes.map((node, index) => {
            // Ajouter des logs pour déboguer
            console.log(`Node ${index}:`, {
              nodeWalletAddress: node.walletAddress,
              statusActive: status.active,
              connectedToNode: status.connectedToNode,
              isConnectedToThisNode: status.active && status.connectedToNode === node.walletAddress,
              fullStatus: status
            });
            
            // Vérifier explicitement si le client est connecté à ce nœud
            const isConnectedToThisNode = status.active && status.connectedToNode === node.walletAddress;
            console.log(`Node ${index} - isConnectedToThisNode:`, isConnectedToThisNode);
            
            return (
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
                    {isConnectedToThisNode ? (
                      <Button
                        variant="danger"
                        onClick={handleDisconnect}
                        loading={isLoading}
                        disabled={isLoading}
                        className="text-xs px-2 py-1"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleConnect(node.walletAddress)}
                        loading={isLoading && selectedNode === node.walletAddress}
                        disabled={isLoading || (status.active && status.connectedToNode !== undefined)}
                        className="text-xs px-2 py-1"
                      >
                        {node.status === 'ACTIVE' ? 'Connect' : 'Réactiver'}
                      </Button>
                    )}
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
            );
          })}
          
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
