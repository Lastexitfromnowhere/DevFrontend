// src/components/dht/DHTNodes.tsx
import React, { useEffect, useState } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card-components';
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
import { Loader2, RefreshCw, Network, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types pour les props des composants Card
interface CardHeaderProps {
  children: React.ReactNode;
}

interface CardTitleProps {
  children: React.ReactNode;
}

interface CardDescriptionProps {
  children: React.ReactNode;
}

interface CardContentProps {
  children: React.ReactNode;
}

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

interface BadgeProps {
  variant?: 'success' | 'error' | 'default';
  className?: string;
  children: React.ReactNode;
}

// Interface pour les nœuds DHT, correspondant à celle définie dans useDHT.ts
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

export default function DHTNodes() {
  const { isAuthenticated } = useAuth();
  const { 
    status, 
    nodes, 
    loading, 
    error, 
    fetchNodes
  } = useDHT();
  const [refreshInterval, setRefreshInterval] = useState<number>(60); // secondes
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Rafraîchir les nœuds périodiquement
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchNodes(false); // Toujours fetch les vrais nœuds
      setLastRefreshed(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, fetchNodes, refreshInterval]);

  // Charger les nœuds au démarrage
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Chargement des nœuds DHT au démarrage...');
      fetchNodes(false).then(loadedNodes => {
        console.log(`${loadedNodes?.length || 0} nœuds DHT chargés au démarrage`);
      });
      setLastRefreshed(new Date());
    }
  }, [isAuthenticated, fetchNodes]);

  const handleRefresh = () => {
    fetchNodes(false); // Toujours fetch les vrais nœuds
    setLastRefreshed(new Date());
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (!isAuthenticated) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg">
        <CardHeader>
          <CardTitle>Nœuds DHT</CardTitle>
          <CardDescription>
            Connectez-vous pour voir les nœuds DHT
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white">Nœuds DHT</CardTitle>
            <CardDescription className="text-gray-300">
              Nœuds découverts sur le réseau décentralisé
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
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-md mb-4 backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
            Dernière mise à jour: {formatDistanceToNow(lastRefreshed, { addSuffix: true, locale: fr })}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">Nœuds trouvés:</span>
            <DashboardBadge variant={nodes.length > 0 ? "success" : "danger"} size="sm">
              {nodes.length}
            </DashboardBadge>
          </div>
        </div>

        {nodes.length === 0 ? (
          <div className="text-center py-8 bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30">
            <Network className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-300">Aucun nœud DHT trouvé sur le réseau</p>
            <p className="text-sm text-gray-400 mt-2">Essayez de rafraîchir ou attendez que d&apos;autres nœuds rejoignent le réseau</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30 p-2">
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
                {nodes.map((node) => (
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
                        <span className="text-gray-400 text-xs">Aucune adresse</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {node.isHost && (
                          <DashboardBadge variant="success" size="sm">
                            Hôte
                          </DashboardBadge>
                        )}
                        {node.isActive && (
                          <DashboardBadge variant="info" size="sm">
                            Actif
                          </DashboardBadge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {node.latency !== undefined ? (
                        <DashboardBadge 
                          variant={node.latency < 100 ? 'success' : node.latency < 300 ? 'warning' : 'danger'} 
                          size="sm"
                        >
                          {node.latency}ms
                        </DashboardBadge>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end border-t border-gray-700/30 pt-4">
        <DashboardButton
          variant="secondary"
          icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'Chargement...' : 'Rafraîchir'}
        </DashboardButton>
      </CardFooter>
    </Card>
  );
}
