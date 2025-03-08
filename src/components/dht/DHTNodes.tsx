// src/components/dht/DHTNodes.tsx
import React, { useEffect, useState } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card-components';
import { TerminalButton } from '@/components/ui/terminal/TerminalButton';
import { Badge } from '@/components/ui/Badge';
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
      fetchNodes();
      setLastRefreshed(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNodes, refreshInterval, autoRefresh]);

  // Charger les nœuds au démarrage
  useEffect(() => {
    if (isAuthenticated) {
      fetchNodes();
      setLastRefreshed(new Date());
    }
  }, [isAuthenticated, fetchNodes]);

  const handleRefresh = () => {
    fetchNodes();
    setLastRefreshed(new Date());
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (!isAuthenticated) {
    return (
      <Card>
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Nœuds DHT</CardTitle>
            <CardDescription>
              Nœuds découverts sur le réseau décentralisé
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <TerminalButton
              variant="secondary"
              icon={<Clock className="mr-2 h-4 w-4" />}
              onClick={toggleAutoRefresh}
            >
              {autoRefresh ? 'Désactiver auto' : 'Activer auto'}
            </TerminalButton>
            <TerminalButton 
              variant="secondary"
              icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? '' : 'Rafraîchir'}
            </TerminalButton>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Dernière mise à jour: {formatDistanceToNow(lastRefreshed, { addSuffix: true, locale: fr })}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Nœuds trouvés:</span>
            <Badge variant={nodes.length > 0 ? "success" : "error"} className="px-2 py-1 text-xs">
              {nodes.length}
            </Badge>
          </div>
        </div>

        {nodes.length === 0 ? (
          <div className="text-center py-8">
            <Network className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun nœud DHT trouvé sur le réseau</p>
            <p className="text-sm text-gray-400 mt-2">Essayez de rafraîchir ou attendez que d&apos;autres nœuds rejoignent le réseau</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID du nœud</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Latence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow key={node.nodeId}>
                    <TableCell className="font-mono text-xs truncate max-w-[150px]">
                      {node.nodeId}
                    </TableCell>
                    <TableCell>
                      {node.multiaddr ? (
                        <div className="text-xs">
                          <div className="truncate max-w-[200px]">{node.multiaddr}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Aucune adresse</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {node.isHost && (
                          <Badge variant="success" className="px-2 py-1 text-xs">
                            Hôte
                          </Badge>
                        )}
                        {node.isActive && (
                          <Badge variant="default" className="px-2 py-1 text-xs">
                            Actif
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {node.latency !== undefined ? (
                        <span className={`text-xs ${node.latency < 100 ? 'text-green-600' : node.latency < 300 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {node.latency}ms
                        </span>
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
      <CardFooter className="flex justify-end">
        <TerminalButton
          variant="secondary"
          icon={loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? '' : 'Rafraîchir'}
        </TerminalButton>
      </CardFooter>
    </Card>
  );
}
