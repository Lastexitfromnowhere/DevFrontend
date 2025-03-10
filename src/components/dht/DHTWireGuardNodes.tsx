// src/components/dht/DHTWireGuardNodes.tsx
import React, { useEffect, useState } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useVPNNode } from '@/hooks/useVPNNode';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card-components';
import { TerminalButton } from '@/components/ui/terminal/TerminalButton';
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
  const [refreshInterval, setRefreshInterval] = useState<number>(60); // secondes
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [connectingToNode, setConnectingToNode] = useState<string | null>(null);
  const [publishingNode, setPublishingNode] = useState<boolean>(false);

  // Rafraîchir la liste des nœuds périodiquement
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
      // La fonction connectToNode attend uniquement l'ID du nœud (qui est son adresse wallet)
      await connectToNode(nodeId);
      // Succès, la connexion est établie
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
        // Rafraîchir la liste après publication
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
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Nœuds WireGuard (DHT)</CardTitle>
          <CardDescription>
            Connectez-vous pour voir les nœuds WireGuard disponibles
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Nœuds WireGuard (DHT)</CardTitle>
            <CardDescription>
              Liste des nœuds WireGuard disponibles via le réseau décentralisé
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Mis à jour {formatDistanceToNow(lastRefreshed, { addSuffix: true, locale: fr })}
            </span>
            <TerminalButton 
              variant="secondary" 
              icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              onClick={handleRefresh}
              disabled={loading}
              className="px-2 py-1"
            >
              {/* Le texte est déjà géré par l'icône */}
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

        <div className="mb-4">
          <TerminalButton
            variant="primary"
            icon={publishingNode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
            onClick={handlePublishNode}
            disabled={publishingNode}
            loading={publishingNode}
          >
            Publier mon nœud WireGuard sur le réseau
          </TerminalButton>
        </div>

        {wireGuardNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Aucun nœud WireGuard trouvé dans le réseau DHT</p>
            <p className="text-sm mt-2">Publiez votre nœud ou attendez que d'autres nœuds rejoignent le réseau</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID (abrégé)</TableHead>
                  <TableHead>Adresse IP</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Dernière activité</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wireGuardNodes.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell className="font-mono text-xs" title={node.id}>
                      {node.id.substring(0, 8)}...{node.id.substring(node.id.length - 4)}
                    </TableCell>
                    <TableCell>{node.ip}</TableCell>
                    <TableCell>{node.port}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(node.lastSeen), { addSuffix: true, locale: fr })}
                    </TableCell>
                    <TableCell>
                      <TerminalButton
                        variant="primary"
                        className="px-2 py-1 text-xs"
                        icon={connectingToNode === node.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link className="h-3 w-3" />}
                        onClick={() => handleConnect(node.id, node.publicKey, node.ip, node.port)}
                        disabled={connectingToNode !== null}
                        loading={connectingToNode === node.id}
                      >
                        Connecter
                      </TerminalButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
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
          <TerminalButton
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={handleRefresh}
            disabled={loading}
            loading={loading}
          >
            Rafraîchir
          </TerminalButton>
        </div>
      </CardFooter>
    </Card>
  );
}
