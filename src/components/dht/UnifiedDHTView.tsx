'use client';

import React, { useEffect, useState } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useDHTNode } from '@/hooks/useDHTNode';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-components';
import { DashboardButton } from '@/components/ui/DashboardButton';
import { DashboardBadge } from '@/components/ui/DashboardBadge';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table-components';
import { Loader2, RefreshCw, Network, Clock, Server, AlertTriangle, Shield, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Utiliser un composant d'onglets simple au lieu de Radix UI
// Nous allons créer un composant d'onglets basique
const SimpleTabs = ({ children, value, onChange }: { children: React.ReactNode, value: string, onChange: (value: string) => void }) => {
  return <div className="w-full">{children}</div>;
};

const SimpleTabsList = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="inline-flex h-10 items-center justify-center rounded-md bg-black/20 p-1 backdrop-blur-sm border border-gray-700/30 mb-4">
      {children}
    </div>
  );
};

const SimpleTabsTrigger = ({ 
  children, 
  value, 
  active, 
  onClick 
}: { 
  children: React.ReactNode, 
  value: string, 
  active: boolean, 
  onClick: () => void 
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
        active 
          ? "bg-blue-500/20 text-white shadow-sm border border-blue-500/30" 
          : "text-gray-300 hover:text-white"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const SimpleTabsContent = ({ 
  children, 
  value, 
  activeValue 
}: { 
  children: React.ReactNode, 
  value: string, 
  activeValue: string 
}) => {
  if (value !== activeValue) return null;
  return <div className="mt-2">{children}</div>;
};

// Interface pour les nœuds DHT
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

// Interface pour les nœuds WireGuard
interface WireGuardNode {
  walletAddress: string;
  publicKey: string;
  ip: string;
  port: number;
  lastSeen: string;
  isActive: boolean;
}

// Étendre l'interface DHTNodeStatus pour inclure la propriété peers
interface ExtendedDHTNodeStatus {
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
  wireGuardConfig?: any;
  peers?: any[];
}

export default function UnifiedDHTView() {
  const { isAuthenticated } = useAuth();
  const { 
    status: dhtStatus, 
    nodes, 
    wireGuardNodes, 
    loading, 
    error, 
    fetchNodes,
    fetchWireGuardNodes,
    publishWireGuardNode
  } = useDHT();
  
  const { 
    status: myNodeStatus, 
    startDHTNode, 
    stopDHTNode, 
    loading: myNodeLoading, 
    error: myNodeError,
    wireGuard: { enable, disable }
  } = useDHTNode();
  
  // Convertir myNodeStatus en ExtendedDHTNodeStatus pour ajouter la propriété peers
  const extendedNodeStatus = myNodeStatus as ExtendedDHTNodeStatus;
  
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("my-node");
  const [publishingNode, setPublishingNode] = useState<boolean>(false);
  const [connectingToNode, setConnectingToNode] = useState<string | null>(null);
  const [showDemoNodes, setShowDemoNodes] = useState<boolean>(false);
  
  // Rafraîchir les nœuds périodiquement
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;

    const interval = setInterval(() => {
      refreshAllData();
    }, 60000); // Rafraîchir toutes les minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh]);

  // Charger les nœuds au démarrage
  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData();
    }
  }, [isAuthenticated]);

  const refreshAllData = async () => {
    try {
      await Promise.all([
        fetchNodes(),
        fetchWireGuardNodes()
      ]);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des données:", error);
    }
  };

  const handleRefresh = () => {
    refreshAllData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const handleStartNode = async () => {
    try {
      await startDHTNode();
      // Rafraîchir les données après le démarrage
      setTimeout(() => refreshAllData(), 1000);
    } catch (error) {
      console.error("Erreur lors du démarrage du nœud:", error);
    }
  };

  const handleStopNode = async () => {
    try {
      await stopDHTNode();
      // Rafraîchir les données après l'arrêt
      setTimeout(() => refreshAllData(), 1000);
    } catch (error) {
      console.error("Erreur lors de l'arrêt du nœud:", error);
    }
  };

  const handleEnableWireGuard = async () => {
    try {
      await enable();
      // Rafraîchir les données après l'activation
      setTimeout(() => refreshAllData(), 1000);
    } catch (error) {
      console.error("Erreur lors de l'activation de WireGuard:", error);
    }
  };

  const handleDisableWireGuard = async () => {
    try {
      await disable();
      // Rafraîchir les données après la désactivation
      setTimeout(() => refreshAllData(), 1000);
    } catch (error) {
      console.error("Erreur lors de la désactivation de WireGuard:", error);
    }
  };

  const handlePublishNode = async () => {
    if (!isAuthenticated) return;
    
    setPublishingNode(true);
    try {
      const success = await publishWireGuardNode();
      if (success) {
        // Rafraîchir la liste après publication
        await fetchWireGuardNodes();
      }
    } catch (error) {
      console.error('Erreur lors de la publication du nœud:', error);
    } finally {
      setPublishingNode(false);
    }
  };

  // Générer des nœuds de démonstration si nécessaire
  const getDemoNodes = (count: number = 5): DHTNode[] => {
    const demoNodes: DHTNode[] = [];
    
    for (let i = 0; i < count; i++) {
      const nodeId = `demo-node-${i}-${Math.random().toString(36).substring(2, 8)}`;
      
      demoNodes.push({
        nodeId: nodeId,
        walletAddress: `0x${Math.random().toString(36).substring(2, 10)}`,
        publicKey: `key-${Math.random().toString(36).substring(2, 10)}`,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        port: 4001 + i,
        multiaddr: `/ip4/192.168.1.${i}/tcp/${4001 + i}/p2p/${nodeId}`,
        isActive: Math.random() > 0.3,
        isHost: Math.random() > 0.5,
        bandwidth: Math.floor(Math.random() * 100) + 10,
        latency: Math.floor(Math.random() * 200) + 5,
        uptime: Math.floor(Math.random() * 86400),
        lastSeen: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
      });
    }
    
    return demoNodes;
  };

  // Générer des nœuds WireGuard de démonstration
  const getDemoWireGuardNodes = (count: number = 3): WireGuardNode[] => {
    const demoNodes: WireGuardNode[] = [];
    
    for (let i = 0; i < count; i++) {
      demoNodes.push({
        walletAddress: `0x${Math.random().toString(36).substring(2, 10)}`,
        publicKey: `wg-${Math.random().toString(36).substring(2, 10)}`,
        ip: `10.8.0.${i + 2}`,
        port: 51820,
        lastSeen: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
        isActive: Math.random() > 0.3
      });
    }
    
    return demoNodes;
  };

  // Combiner les nœuds réels avec les nœuds de démonstration si nécessaire
  const displayedNodes = showDemoNodes && nodes.length === 0 
    ? getDemoNodes() 
    : nodes;
    
  const displayedWireGuardNodes = showDemoNodes && wireGuardNodes.length === 0 
    ? getDemoWireGuardNodes() 
    : wireGuardNodes;

  if (!isAuthenticated) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">Réseau DHT</CardTitle>
          <CardDescription className="text-gray-300">
            Connectez-vous pour voir et gérer vos nœuds DHT
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white">Réseau DHT</CardTitle>
            <CardDescription className="text-gray-300">
              Gérez votre nœud et découvrez les autres nœuds du réseau
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <DashboardButton
              variant="secondary"
              icon={<Clock className="h-4 w-4" />}
              onClick={toggleAutoRefresh}
              size="sm"
            >
              {autoRefresh ? 'Désactiver auto' : 'Activer auto'}
            </DashboardButton>
            <DashboardButton 
              variant="secondary"
              icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              onClick={handleRefresh}
              disabled={loading}
              size="sm"
            >
              {loading ? '' : 'Rafraîchir'}
            </DashboardButton>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
          Dernière mise à jour: {formatDistanceToNow(lastRefreshed, { addSuffix: true, locale: fr })}
        </div>
      </CardHeader>
      
      <CardContent className="px-0 pb-0">
        {(error || myNodeError) && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-md mb-4 backdrop-blur-sm">
            {error || myNodeError}
          </div>
        )}
        
        <SimpleTabs value={activeTab} onChange={setActiveTab}>
          <SimpleTabsList>
            <SimpleTabsTrigger 
              value="my-node" 
              active={activeTab === "my-node"} 
              onClick={() => setActiveTab("my-node")}
            >
              <Server className="h-4 w-4 mr-2" />
              Mon Nœud
            </SimpleTabsTrigger>
            <SimpleTabsTrigger 
              value="dht-nodes" 
              active={activeTab === "dht-nodes"} 
              onClick={() => setActiveTab("dht-nodes")}
            >
              <Network className="h-4 w-4 mr-2" />
              Nœuds DHT
            </SimpleTabsTrigger>
            <SimpleTabsTrigger 
              value="wireguard-nodes" 
              active={activeTab === "wireguard-nodes"} 
              onClick={() => setActiveTab("wireguard-nodes")}
            >
              <Shield className="h-4 w-4 mr-2" />
              Nœuds WireGuard
            </SimpleTabsTrigger>
          </SimpleTabsList>
          
          {/* Onglet Mon Nœud */}
          <SimpleTabsContent value="my-node" activeValue={activeTab}>
            <div className="bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">État de mon nœud DHT</h3>
                <DashboardBadge variant={myNodeStatus.active ? "success" : "danger"} dot>
                  {myNodeStatus.active ? 'Actif' : 'Inactif'}
                </DashboardBadge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/30 p-3 rounded-md">
                  <div className="text-gray-400 mb-1">ID du nœud:</div>
                  <div className="text-green-300 font-mono text-sm truncate">
                    {myNodeStatus.nodeId || 'Non disponible'}
                  </div>
                </div>
                <div className="bg-black/30 p-3 rounded-md">
                  <div className="text-gray-400 mb-1">Connexions:</div>
                  <div className="text-green-300">
                    {myNodeStatus.connectedPeers || 0}
                  </div>
                </div>
                <div className="bg-black/30 p-3 rounded-md">
                  <div className="text-gray-400 mb-1">Pairs:</div>
                  <div className="text-green-300">
                    {myNodeStatus.connectedPeers || 0}
                  </div>
                </div>
                <div className="bg-black/30 p-3 rounded-md">
                  <div className="text-gray-400 mb-1">WireGuard:</div>
                  <div className="text-green-300">
                    {myNodeStatus.wireGuardEnabled ? 'Activé' : 'Désactivé'}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {myNodeStatus.active ? (
                  <DashboardButton
                    variant="danger"
                    icon={myNodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    onClick={handleStopNode}
                    disabled={myNodeLoading}
                  >
                    Arrêter le nœud
                  </DashboardButton>
                ) : (
                  <DashboardButton
                    variant="success"
                    icon={myNodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    onClick={handleStartNode}
                    disabled={myNodeLoading}
                  >
                    Démarrer le nœud
                  </DashboardButton>
                )}
                
                {myNodeStatus.active && (
                  myNodeStatus.wireGuardEnabled ? (
                    <DashboardButton
                      variant="secondary"
                      icon={myNodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      onClick={handleDisableWireGuard}
                      disabled={myNodeLoading}
                    >
                      Désactiver WireGuard
                    </DashboardButton>
                  ) : (
                    <DashboardButton
                      variant="primary"
                      icon={myNodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      onClick={handleEnableWireGuard}
                      disabled={myNodeLoading}
                    >
                      Activer WireGuard
                    </DashboardButton>
                  )
                )}
                
                {myNodeStatus.active && myNodeStatus.wireGuardEnabled && (
                  <DashboardButton
                    variant="secondary"
                    icon={publishingNode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                    onClick={handlePublishNode}
                    disabled={publishingNode}
                  >
                    Publier sur le réseau
                  </DashboardButton>
                )}
              </div>
            </div>
          </SimpleTabsContent>
          
          {/* Onglet Nœuds DHT */}
          <SimpleTabsContent value="dht-nodes" activeValue={activeTab}>
            <div className="bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Nœuds DHT découverts</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">Nœuds trouvés:</span>
                  <DashboardBadge variant={displayedNodes.length > 0 ? "success" : "danger"} size="sm">
                    {displayedNodes.length}
                  </DashboardBadge>
                </div>
              </div>
              
              {displayedNodes.length === 0 ? (
                <div className="text-center py-8">
                  <Network className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-300">Aucun nœud DHT trouvé sur le réseau</p>
                  <div className="mt-4">
                    <DashboardButton
                      variant="secondary"
                      onClick={() => setShowDemoNodes(!showDemoNodes)}
                    >
                      {showDemoNodes ? 'Masquer les nœuds de démo' : 'Afficher des nœuds de démo'}
                    </DashboardButton>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-700/30">
                        <TableHead className="text-gray-300">ID du nœud</TableHead>
                        <TableHead className="text-gray-300">Adresse</TableHead>
                        <TableHead className="text-gray-300">Statut</TableHead>
                        <TableHead className="text-gray-300">Latence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedNodes.map((node) => (
                        <TableRow key={node.nodeId} className="border-b border-gray-700/20 hover:bg-black/30">
                          <TableCell className="font-mono text-xs truncate max-w-[150px] text-blue-400 bg-blue-500/10 backdrop-blur-sm rounded p-1">
                            {node.nodeId}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {node.multiaddr ? (
                              <div className="text-xs">
                                <div className="truncate max-w-[200px] bg-black/30 backdrop-blur-sm p-1 rounded">{node.multiaddr}</div>
                              </div>
                            ) : (
                              <span className="text-gray-500">Non disponible</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DashboardBadge variant={node.isActive ? "success" : "danger"} size="sm">
                              {node.isActive ? 'Actif' : 'Inactif'}
                            </DashboardBadge>
                          </TableCell>
                          <TableCell>
                            {node.latency !== undefined ? (
                              <span className={`text-sm ${node.latency < 100 ? 'text-green-400' : node.latency < 200 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {node.latency} ms
                              </span>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {showDemoNodes && displayedNodes.length > 0 && (
                <div className="mt-2 text-xs text-amber-400 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Certains nœuds affichés sont des exemples de démonstration
                </div>
              )}
            </div>
          </SimpleTabsContent>
          
          {/* Onglet Nœuds WireGuard */}
          <SimpleTabsContent value="wireguard-nodes" activeValue={activeTab}>
            <div className="bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Nœuds WireGuard disponibles</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">Nœuds trouvés:</span>
                  <DashboardBadge variant={displayedWireGuardNodes.length > 0 ? "success" : "danger"} size="sm">
                    {displayedWireGuardNodes.length}
                  </DashboardBadge>
                </div>
              </div>
              
              {myNodeStatus.active && myNodeStatus.wireGuardEnabled && (
                <div className="mb-4">
                  <DashboardButton
                    variant="primary"
                    icon={publishingNode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                    onClick={handlePublishNode}
                    disabled={publishingNode}
                  >
                    Publier mon nœud WireGuard sur le réseau
                  </DashboardButton>
                </div>
              )}
              
              {displayedWireGuardNodes.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-300">Aucun nœud WireGuard trouvé sur le réseau</p>
                  <div className="mt-4">
                    <DashboardButton
                      variant="secondary"
                      onClick={() => setShowDemoNodes(!showDemoNodes)}
                    >
                      {showDemoNodes ? 'Masquer les nœuds de démo' : 'Afficher des nœuds de démo'}
                    </DashboardButton>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-700/30">
                        <TableHead className="text-gray-300">ID du nœud</TableHead>
                        <TableHead className="text-gray-300">Adresse IP</TableHead>
                        <TableHead className="text-gray-300">Port</TableHead>
                        <TableHead className="text-gray-300">Statut</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedWireGuardNodes.map((node, index) => {
                        // Utiliser une assertion de type pour éviter les erreurs TypeScript
                        const nodeWithActive = node as WireGuardNode & { isActive: boolean };
                        const isActive = nodeWithActive.isActive ?? true; // Valeur par défaut si non définie
                        
                        return (
                          <TableRow key={index} className="border-b border-gray-700/20 hover:bg-black/30">
                            <TableCell className="font-mono text-xs truncate max-w-[150px] text-blue-400">
                              {node.walletAddress.substring(0, 6)}...{node.walletAddress.substring(node.walletAddress.length - 4)}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {node.ip}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {node.port}
                            </TableCell>
                            <TableCell>
                              <DashboardBadge variant={isActive ? "success" : "danger"} size="sm">
                                {isActive ? 'Actif' : 'Inactif'}
                              </DashboardBadge>
                            </TableCell>
                            <TableCell>
                              <DashboardButton
                                variant="primary"
                                size="sm"
                                disabled={connectingToNode === node.walletAddress}
                              >
                                {connectingToNode === node.walletAddress ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Connecter'
                                )}
                              </DashboardButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {showDemoNodes && displayedWireGuardNodes.length > 0 && (
                <div className="mt-2 text-xs text-amber-400 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Certains nœuds affichés sont des exemples de démonstration
                </div>
              )}
            </div>
          </SimpleTabsContent>
        </SimpleTabs>
      </CardContent>
    </Card>
  );
}
