'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { useDHTNode } from '@/hooks/useDHTNode';
import { Network, Clock, Activity, Server } from 'lucide-react';

export default function NodeStatusSummary() {
  const { status, loading, error } = useDHTNode();
  
  // Formater la dernière mise à jour
  const formatLastUpdated = (lastUpdated?: string) => {
    if (!lastUpdated) return 'Jamais';
    return new Date(lastUpdated).toLocaleString();
  };

  // Obtenir le temps écoulé depuis la dernière mise à jour
  const getTimeSinceUpdate = (lastUpdated?: string) => {
    if (!lastUpdated) return 'Jamais mis à jour';
    
    const lastUpdateTime = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    const diffMs = now - lastUpdateTime;
    
    // Convertir en secondes
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    return `${Math.floor(diffSec / 86400)}j`;
  };

  return (
    <Card className="p-4 border-green-800 bg-black/50">
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className={`flex items-center ${status.active ? 'text-green-500' : 'text-red-500'}`}>
            <Activity className="w-4 h-4 mr-1" />
            {status.active ? 'Actif' : 'Inactif'}
          </span>
          {status.active && status.nodeType && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              status.nodeType === 'HOST' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              {status.nodeType === 'HOST' ? 'Hébergeur' : 'Client'}
            </span>
          )}
          {status.active && status.protocol && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              status.protocol === 'WireGuard' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {status.protocol}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            {status.protocol === 'WireGuard' ? (
              <Server className={status.active ? "text-purple-400" : "text-gray-500"} size={20} />
            ) : (
              <Network className={status.active ? "text-green-400" : "text-gray-500"} size={20} />
            )}
            <h3 className="font-medium">
              {status.active ? `Nœud ${status.protocol || 'DHT'} actif` : `Nœud ${status.protocol || 'DHT'} inactif`}
            </h3>
          </div>
          
          <div className="flex items-center text-xs text-gray-400">
            <Clock size={14} className="mr-1" />
            <span title={`Dernière mise à jour: ${formatLastUpdated(status.lastUpdated)}`}>
              {getTimeSinceUpdate(status.lastUpdated)}
            </span>
          </div>
        </div>
        
        {status.active && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <span className="text-gray-400 mr-1">ID:</span>
              <span className="text-green-300">{status.nodeId ? status.nodeId.substring(0, 8) + '...' : 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 mr-1">Pairs:</span>
              <span className="text-green-300">{status.connectedPeers || 0}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 mr-1">Stockage:</span>
              <span className="text-green-300">
                {status.storageUsed !== undefined && status.totalStorage !== undefined 
                  ? `${Math.round(status.storageUsed / 1024 / 1024)}MB / ${Math.round(status.totalStorage / 1024 / 1024)}MB`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 mr-1">Uptime:</span>
              <span className="text-green-300">
                {status.uptime !== undefined 
                  ? `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m`
                  : 'N/A'}
              </span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-2 text-red-400 text-xs">
            {error}
          </div>
        )}
      </div>
    </Card>
  );
}
