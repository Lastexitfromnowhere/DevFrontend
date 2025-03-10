"use client";

// src/components/dht/DHTStatusModern.tsx
import React, { useEffect } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useAuth } from '@/hooks/useAuth';
import { ActionPanel } from '@/components/ui/ActionPanel';
import { Badge } from '@/components/ui/Badge';

export default function DHTStatusModern() {
  const { isAuthenticated } = useAuth();
  const { 
    status, 
    loading, 
    error, 
    fetchStatus, 
    startNode, 
    stopNode 
  } = useDHT();

  // Rafraîchir le statut périodiquement
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchStatus]);

  if (!isAuthenticated) {
    return (
      <ActionPanel
        title="Statut du nœud DHT"
        description="Connectez-vous pour voir le statut du nœud DHT"
      />
    );
  }

  return (
    <ActionPanel
      title="Statut du nœud DHT"
      description="Réseau décentralisé Kademlia"
      status={loading ? 'loading' : status.isActive ? 'active' : 'inactive'}
      onRefresh={fetchStatus}
      onStart={startNode}
      onStop={stopNode}
    >
      {error && (
        <div className="bg-red-900/30 text-red-400 p-3 rounded-md mb-4 border border-red-900/50">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-white">État du nœud:</span>
          <Badge variant={status.isActive ? "success" : "default"}>
            {status.isActive ? "Actif" : "Inactif"}
          </Badge>
        </div>

        {status.isActive && status.nodeId && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">ID du nœud:</span>
              <span className="text-sm text-gray-400 truncate max-w-[200px]">{status.nodeId}</span>
            </div>

            {status.stats && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Connexions:</span>
                  <span className="text-white">{status.stats.connections}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Pairs connectés:</span>
                  <span className="text-white">{status.stats.peers.length}</span>
                </div>

                {status.stats.addresses.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 text-white">Adresses d&apos;écoute:</h4>
                    <div className="bg-[#111] p-2 rounded-md text-xs overflow-auto max-h-[100px] border border-gray-800">
                      {status.stats.addresses.map((addr: string, index: number) => (
                        <div key={index} className="mb-1 break-all text-gray-400">
                          {addr}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {status.stats.peers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 text-white">Pairs connectés:</h4>
                    <div className="bg-[#111] p-2 rounded-md text-xs overflow-auto max-h-[150px] border border-gray-800">
                      {status.stats.peers.map((peer: any, index: number) => (
                        <div key={index} className="mb-2 break-all text-gray-400">
                          <div><strong className="text-white">ID:</strong> {peer?.id ? `${peer.id.substring(0, 20)}...` : 'ID non disponible'}</div>
                          <div><strong className="text-white">Direction:</strong> {peer?.direction || 'N/A'}</div>
                          <div><strong className="text-white">Latence:</strong> {peer?.latency !== undefined ? `${peer.latency}ms` : 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ActionPanel>
  );
}
