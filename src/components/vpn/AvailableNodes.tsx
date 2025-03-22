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
    fetchAvailableNodes,
    status
  } = useVPNNode();
  
  const [availableNodes, setAvailableNodes] = useState<VPNNode[]>([]);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [localNodes, setLocalNodes] = useState<VPNNode[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnectedToThisNode, setIsConnectedToThisNode] = useState<boolean>(false);
  
  // Fonction pour générer des nœuds de démonstration
  const generateLocalDemoNodes = (count: number = 3): VPNNode[] => {
    console.log(`Génération de ${count} nœuds de démonstration locaux`);
    const demoNodes: VPNNode[] = [];
    
    for (let i = 0; i < count; i++) {
      const nodeId = `demo-node-${i}-${Math.random().toString(36).substring(2, 8)}`;
      demoNodes.push({
        walletAddress: `demo-wallet-${i}-${Math.random().toString(36).substring(2, 8)}`,
        ip: `192.168.1.${10 + i}`,
        location: {
          country: 'France',
          region: 'Île-de-France'
        },
        performance: {
          bandwidth: Math.floor(Math.random() * 1000),
          latency: Math.floor(Math.random() * 100)
        },
        connectedUsers: Math.floor(Math.random() * 10),
        lastSeen: new Date().toISOString(),
        score: Math.random() * 5,
        lastChecked: new Date().toISOString(),
        status: 'ACTIVE'
      });
    }
    
    console.log('Nœuds de démonstration locaux générés:', demoNodes);
    return demoNodes;
  };
  
  // Fonction pour récupérer les nœuds disponibles
  const loadAvailableNodes = async (forceRefresh: boolean = false): Promise<VPNNode[]> => {
    setIsRefreshing(true);
    try {
      // Utiliser directement la fonction du hook useVPNNode pour récupérer les nœuds
      // Cette approche garantit la cohérence entre les différentes parties de l'application
      const nodes = await fetchAvailableNodes(forceRefresh);
      console.log('Nœuds récupérés dans AvailableNodes:', nodes);
      
      if (!nodes || nodes.length === 0) {
        console.log('Aucun nœud récupéré, génération de nœuds de démonstration locaux');
        const demoNodes = generateLocalDemoNodes(5);
        setAvailableNodes(demoNodes);
        return demoNodes;
      }
      
      setAvailableNodes(nodes);
      return nodes;
    } catch (error) {
      console.error('Error fetching available nodes:', error);
      setErrorState('Impossible de récupérer les nœuds disponibles. Utilisation de nœuds de démonstration.');
      
      // En cas d'erreur, essayer d'utiliser le cache
      const cachedNodes = localStorage.getItem('availableNodesCache');
      if (cachedNodes) {
        try {
          const parsedNodes = JSON.parse(cachedNodes);
          console.log('Utilisation du cache de nœuds:', parsedNodes);
          if (parsedNodes && parsedNodes.length > 0) {
            setAvailableNodes(parsedNodes);
            return parsedNodes;
          }
        } catch (e) {
          console.error('Erreur lors de l\'analyse du cache de nœuds:', e);
        }
      }
      
      // Si le cache ne fonctionne pas, générer des nœuds de démonstration
      console.log('Génération de nœuds de démonstration après échec de récupération');
      const demoNodes = generateLocalDemoNodes(5);
      setAvailableNodes(demoNodes);
      return demoNodes;
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
    loadAvailableNodes(true);
  };
  
  // Effet pour charger les nœuds disponibles au chargement du composant
  useEffect(() => {
    setIsLoadingNodes(true);
    
    // Ajouter un log pour voir le statut actuel
    console.log('Status actuel au chargement:', status);
    
    // Forcer le rafraîchissement des nœuds au chargement
    loadAvailableNodes(true)
      .then(nodes => {
        console.log('Nœuds chargés au montage du composant:', nodes);
        console.log('Nombre de nœuds chargés:', nodes.length);
        setLocalNodes(nodes);
        setAvailableNodes(nodes);
        setIsLoadingNodes(false);
      })
      .catch(error => {
        console.error('Error in initial node fetch:', error);
        setIsLoadingNodes(false);
      });
      
    // Mettre en place un intervalle pour rafraîchir les nœuds toutes les 30 secondes
    const intervalId = setInterval(() => {
      loadAvailableNodes()
        .then(nodes => {
          console.log('Nœuds rafraîchis par intervalle:', nodes);
          console.log('Nombre de nœuds rafraîchis:', nodes.length);
          setLocalNodes(nodes);
          setAvailableNodes(nodes);
        });
      // Ajouter un log pour voir le statut à chaque rafraîchissement
      console.log('Status à l\'intervalle de rafraîchissement:', status);
    }, 30000);
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(intervalId);
  }, []);
  
  // Effet pour mettre à jour isConnectedToThisNode lorsque le statut change
  useEffect(() => {
    console.log('Status mis à jour dans AvailableNodes:', status);
    // Vérifier si nous sommes connectés à un nœud
    if (status.active && status.connectedToNode) {
      console.log('Connecté au nœud:', status.connectedToNode);
    } else {
      console.log('Non connecté à un nœud');
    }
  }, [status]);
  
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
        loadAvailableNodes(true);
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
      
      <div className="mb-2 text-xs text-gray-400">
        {localNodes.length > 0 ? `${localNodes.length} nodes available` : 'No nodes available'}
      </div>
      
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
              isConnectedToThisNode: isConnectedToThisNode,
              fullStatus: status
            });
            
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
                        variant={status.active && status.connectedToNode === node.walletAddress ? "secondary" : "primary"}
                        onClick={() => handleConnect(node.walletAddress)}
                        loading={isLoading && selectedNode === node.walletAddress}
                        disabled={isLoading || (status.active && status.connectedToNode === node.walletAddress)}
                        className={`text-xs px-2 py-1 ${status.active && status.connectedToNode === node.walletAddress ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
                      >
                        {status.active && status.connectedToNode === node.walletAddress ? 'Connected' : 'Connect'}
                      </Button>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Last seen: {formatRelativeTime(node.lastSeen)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Status: <span className="text-green-400">
                        En ligne
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
