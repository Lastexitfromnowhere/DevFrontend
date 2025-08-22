import React, { useEffect, useState } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useVPNNode } from '@/hooks/useVPNNode';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card-components';
import { DashboardButton } from '@/components/ui/DashboardButton';
import { DashboardBadge } from '@/components/ui/DashboardBadge';
import { Loader2, RefreshCw, Network, Clock, Link } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table-components';
export default function DHTWireGuardNodes() {
  const { isAuthenticated } = useAuth();
  const { 
    wireGuardNodes, 
    loading, 
    error, 
    fetchWireGuardNodes,
    publishWireGuardNode
  } = useDHT();
  const { connectToNode } = useVPNNode();
  const [refreshInterval, setRefreshInterval] = useState<number>(60); 
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [connectingToNode, setConnectingToNode] = useState<string | null>(null);
  const [publishingNode, setPublishingNode] = useState<boolean>(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchWireGuardNodes();
    setLastRefreshed(new Date());
    const interval = setInterval(() => {
      fetchWireGuardNodes();
      setLastRefreshed(new Date());
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchWireGuardNodes, refreshInterval]);
  const handleRefresh = () => {
    fetchWireGuardNodes();
    setLastRefreshed(new Date());
  };
  const handleConnect = async (nodeId: string, publicKey: string, ip: string, port: number) => {
    if (!isAuthenticated) return;
    setConnectingToNode(nodeId);
    try {
      await connectToNode(nodeId);
    } catch (error) {
      console.error('Erreur lors de la connexion au nœud:', error);
    } finally {
      setConnectingToNode(null);
    }
  };
  const handlePublishNode = async () => {
    if (!isAuthenticated) return;
    setPublishingNode(true);
    try {
      const success = await publishWireGuardNode();
      if (success) {
        await fetchWireGuardNodes();
      }
    } catch (error) {
      console.error('Erreur lors de la publication du nœud:', error);
    } finally {
      setPublishingNode(false);
    }
  };
  if (!isAuthenticated) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-white">Nœuds WireGuard (DHT)</CardTitle>
          <CardDescription className="text-gray-300">
            Connectez-vous pour voir les nœuds WireGuard disponibles
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow">
      <CardHeader className="px-0 pt-0">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white">Nœuds WireGuard (DHT)</CardTitle>
            <CardDescription className="text-gray-300">
              Liste des nœuds WireGuard disponibles via le réseau décentralisé
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 flex items-center">
              <Clock className="h-3 w-3 mr-1 text-blue-400" />
              Mis à jour {formatDistanceToNow(lastRefreshed, { addSuffix: true, locale: fr })}
            </span>
            <DashboardButton 
              variant="secondary" 
              icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              onClick={handleRefresh}
              disabled={loading}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-md backdrop-blur-sm mb-4">
            {error}
          </div>
        )}
        <div className="mb-4">
          <DashboardButton
            variant="primary"
            icon={publishingNode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
            onClick={handlePublishNode}
            disabled={publishingNode}
            loading={publishingNode}
          >
            Publier mon nœud WireGuard sur le réseau
          </DashboardButton>
        </div>
        {wireGuardNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Aucun nœud WireGuard trouvé dans le réseau DHT</p>
            <p className="text-sm mt-2">Publiez votre nœud ou attendez que d'autres nœuds rejoignent le réseau</p>
          </div>
        ) : (
          <div className="bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30 overflow-hidden">
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
                {wireGuardNodes.map((node) => (
                  <TableRow 
                    key={node.id} 
                    className="border-b border-gray-700/30 transition-colors hover:bg-black/30"
                  >
                    <TableCell className="font-mono text-xs text-gray-300">
                      {node.id.substring(0, 8)}...{node.id.substring(node.id.length - 4)}
                    </TableCell>
                    <TableCell className="text-white">{node.ip}</TableCell>
                    <TableCell className="text-white">{node.port}</TableCell>
                    <TableCell>
                      <DashboardBadge 
                        variant={node.lastSeen ? "success" : "danger"}
                        size="sm"
                      >
                        {formatDistanceToNow(new Date(node.lastSeen), { addSuffix: true, locale: fr })}
                      </DashboardBadge>
                    </TableCell>
                    <TableCell>
                      <DashboardButton
                        variant="secondary"
                        size="sm"
                        icon={connectingToNode === node.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link className="h-3 w-3" />}
                        onClick={() => handleConnect(node.id, node.publicKey, node.ip, node.port)}
                        disabled={connectingToNode !== null}
                        loading={connectingToNode === node.id}
                      >
                        Connecter
                      </DashboardButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-400">
          {wireGuardNodes.length} nœud(s) trouvé(s)
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Rafraîchir tous les:</span>
          <select 
            className="border border-gray-400 rounded p-2 text-base font-medium text-gray-800 bg-white shadow-sm hover:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value="30" className="text-gray-800 font-medium">30s</option>
            <option value="60" className="text-gray-800 font-medium">1min</option>
            <option value="300" className="text-gray-800 font-medium">5min</option>
          </select>
          <DashboardButton
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={handleRefresh}
            disabled={loading}
            loading={loading}
          >
            Rafraîchir
          </DashboardButton>
        </div>
      </CardFooter>
    </Card>
  );
}
