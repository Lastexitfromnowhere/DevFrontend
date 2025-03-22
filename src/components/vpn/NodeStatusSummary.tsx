'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { DashboardBadge } from '../ui/DashboardBadge';
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
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-4 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow">
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <DashboardBadge variant={status.active ? "success" : "danger"} dot>
            {status.active ? 'Actif' : 'Inactif'}
          </DashboardBadge>
          {status.active && status.nodeType && (
            <DashboardBadge variant={status.nodeType === 'HOST' ? "info" : "success"}>
              {status.nodeType === 'HOST' ? 'Hébergeur' : 'Client'}
            </DashboardBadge>
          )}
          {status.active && status.protocol && (
            <DashboardBadge variant={status.protocol === 'WireGuard' ? "info" : "warning"}>
              {status.protocol}
            </DashboardBadge>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            {status.protocol === 'WireGuard' ? (
              <div className="p-2 rounded-full bg-purple-500/20 backdrop-blur-sm">
                <Server className={status.active ? "text-purple-400" : "text-gray-500"} size={16} />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-green-500/20 backdrop-blur-sm">
                <Network className={status.active ? "text-green-400" : "text-gray-500"} size={16} />
              </div>
            )}
            <h3 className="font-medium text-white">
              {status.active ? `Nœud ${status.protocol || 'DHT'} actif` : `Nœud ${status.protocol || 'DHT'} inactif`}
            </h3>
          </div>
          
          <div className="flex items-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-1 px-2 rounded-md">
            <Clock size={14} className="mr-1" />
            <span title={`Dernière mise à jour: ${formatLastUpdated(status.lastUpdated)}`}>
              {getTimeSinceUpdate(status.lastUpdated)}
            </span>
          </div>
        </div>
        
        {status.active && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm bg-black/20 backdrop-blur-sm p-3 rounded-md border border-gray-700/30">
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
