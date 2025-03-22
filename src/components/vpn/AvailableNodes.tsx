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
  const [useDemoNodes, setUseDemoNodes] = useState(true);
  
  // Fonction pour générer des nœuds de démonstration
  const generateLocalDemoNodes = (count: number = 3): VPNNode[] => {
    console.log(`Génération de ${count} nœuds de démonstration locaux`);
    const demoNodes: VPNNode[] = [];
    
    const countries = ['France', 'Germany', 'United States', 'Japan', 'Canada'];
    const regions = ['Île-de-France', 'Bavaria', 'California', 'Tokyo', 'Ontario'];
    
    for (let i = 0; i < count; i++) {
      const countryIndex = Math.floor(Math.random() * countries.length);
      const nodeId = `demo-node-${i}-${Math.random().toString(36).substring(2, 8)}`;
      const bandwidth = Math.floor(Math.random() * 500) + 100; // 100-600 Mbps
      const latency = Math.floor(Math.random() * 50) + 5; // 5-55 ms
      
      demoNodes.push({
        walletAddress: `demo-wallet-${i}-${Math.random().toString(36).substring(2, 8)}`,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        location: {
          country: countries[countryIndex],
          region: regions[countryIndex]
        },
        performance: {
          bandwidth: bandwidth,
          latency: latency
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
  const loadAvailableNodes = async (forceRefresh: boolean = false, useDemoNodesAsFallback: boolean = true): Promise<VPNNode[]> => {
    setIsRefreshing(true);
    try {
      // Utiliser directement la fonction du hook useVPNNode pour récupérer les nœuds
      // Cette approche garantit la cohérence entre les différentes parties de l'application
      const nodes = await fetchAvailableNodes(forceRefresh);
      console.log('Nœuds récupérés dans AvailableNodes:', nodes);
      
      if (!nodes || nodes.length === 0) {
        console.log('Aucun nœud récupéré');
        
        if (useDemoNodesAsFallback) {
          console.log('Génération de nœuds de démonstration locaux comme solution de repli');
          const demoNodes = generateLocalDemoNodes(5);
          setAvailableNodes(demoNodes);
          return demoNodes;
        } else {
          console.log('Aucun nœud de démonstration généré car l\'option est désactivée');
          setAvailableNodes([]);
          return [];
        }
      }
      
      console.log('Nœuds réels récupérés:', nodes);
      setAvailableNodes(nodes);
      return nodes;
    } catch (error) {
      console.error('Error fetching available nodes:', error);
      setErrorState('Impossible de récupérer les nœuds disponibles.');
      
      if (useDemoNodesAsFallback) {
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
      } else {
        console.log('Aucun nœud de démonstration généré malgré l\'erreur car l\'option est désactivée');
        setAvailableNodes([]);
        return [];
      }
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Fonction pour charger les nœuds au chargement du composant
  useEffect(() => {
    loadAvailableNodes(false, useDemoNodes);
  }, []);
  
  // Fonction pour rafraîchir les nœuds avec ou sans nœuds de démonstration
  const refreshNodes = (useDemoNodesAsFallback: boolean = true) => {
    setUseDemoNodes(useDemoNodesAsFallback);
    loadAvailableNodes(true, useDemoNodesAsFallback);
  };
  
  // Fonction pour se connecter à un nœud
  const handleConnectToNode = async (node: VPNNode) => {
    if (!node.walletAddress) {
      console.error('Adresse de wallet manquante pour le nœud');
      return;
    }
    
    setSelectedNode(node.walletAddress);
    try {
      const result = await connectToNode(node.walletAddress);
      if (result) {
        setIsConnectedToThisNode(true);
        // Mettre à jour l'interface pour refléter la connexion
      }
    } catch (error) {
      console.error('Erreur lors de la connexion au nœud:', error);
    }
  };
  
  // Fonction pour se déconnecter d'un nœud
  const handleDisconnectFromNode = async () => {
    try {
      const result = await disconnectFromNode();
      if (result) {
        setIsConnectedToThisNode(false);
        setSelectedNode(null);
        // Mettre à jour l'interface pour refléter la déconnexion
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion du nœud:', error);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Nœuds VPN disponibles</h2>
        <div className="flex space-x-2">
          <Button 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center space-x-2"
            onClick={() => refreshNodes(false)}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Spinner size="sm" /> : <AlertTriangle className="h-4 w-4" />}
            <span>Nœuds réels uniquement</span>
          </Button>
          <Button 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center space-x-2"
            onClick={() => refreshNodes(true)}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
            <span>Inclure nœuds démo</span>
          </Button>
        </div>
      </div>
      
      {errorState && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {errorState}
        </div>
      )}
      
      {availableNodes.length === 0 ? (
        <div className="text-center py-8">
          <Server className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Aucun nœud VPN disponible actuellement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {availableNodes.map((node, index) => (
            <Card key={index} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <Wifi className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-medium">
                      {node.location?.country || 'Location inconnue'} 
                      {node.location?.region && ` (${node.location.region})`}
                    </h3>
                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                      {node.walletAddress?.substring(0, 10)}...{node.walletAddress?.substring(node.walletAddress.length - 8)}
                    </p>
                  </div>
                </div>
                
                <div>
                  {selectedNode === node.walletAddress && isConnectedToThisNode ? (
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleDisconnectFromNode}
                      disabled={isLoading}
                    >
                      {isLoading ? <Spinner size="sm" /> : 'Déconnecter'}
                    </Button>
                  ) : (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleConnectToNode(node)}
                      disabled={isLoading || (selectedNode !== null && selectedNode !== node.walletAddress)}
                    >
                      {isLoading && selectedNode === node.walletAddress ? <Spinner size="sm" /> : 'Connecter'}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {node.performance?.bandwidth ? `${node.performance.bandwidth} Mbps` : 'Bande passante inconnue'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {node.performance?.latency ? `${node.performance.latency} ms` : 'Latence inconnue'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {node.connectedUsers !== undefined ? `${node.connectedUsers} utilisateurs` : 'Utilisateurs inconnus'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {node.score !== undefined ? `Score: ${node.score.toFixed(1)}/5` : 'Score inconnu'}
                  </span>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500 text-right">
                Dernière activité: {formatRelativeTime(node.lastSeen)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
