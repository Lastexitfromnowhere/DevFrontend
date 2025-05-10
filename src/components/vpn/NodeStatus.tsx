'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { DashboardButton } from '../ui/DashboardButton';
import { DashboardBadge } from '../ui/DashboardBadge';
import { useWalletContext } from '@/contexts/WalletContext';
import { useVPNNode } from '@/hooks/useVPNNode';
import { Activity, Signal, Award, Zap, Clock, AlertTriangle, Wifi, RefreshCw, Power, WifiOff, Server, Users } from 'lucide-react';
import { config } from '@/config/env';
import AvailableNodes from './AvailableNodes'; // Importer le composant AvailableNodes

export default function NodeStatus() {
  const { isConnected } = useWalletContext();
  const { 
    status, 
    isLoading, 
    error, 
    startNode, 
    stopNode, 
    connectToNode, 
    disconnectFromNode, 
    fetchNodeStatus,
    fetchConnectedClients,
    disconnectClient
  } = useVPNNode();
  
  // Initialize isHost from localStorage or default to false
  const [isHost, setIsHost] = React.useState(() => {
    // Always start in client mode by default
    return false;
  });

  // Save isHost to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('vpnNodeIsHost', isHost.toString());
  }, [isHost]);

  // Update isHost based on node status
  React.useEffect(() => {
    if (status.nodeType === 'HOST') {
      setIsHost(true);
    }
    // Remove automatic reset of host mode
    // Never automatically reset host mode, even if the node is inactive
  }, [status.nodeType]);

  // Function to get color based on connection quality
  const getQualityColor = (quality?: number) => {
    if (!quality) return 'text-gray-500';
    if (quality >= 80) return 'text-green-500';
    if (quality >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Function to get the tier icon and color
  const getTierInfo = (tier?: string) => {
    switch (tier) {
      case 'ELITE':
        return { color: 'text-purple-500', icon: '👑' };
      case 'PRO':
        return { color: 'text-blue-500', icon: '⭐' };
      default:
        return { color: 'text-green-500', icon: '🌟' };
    }
  };

  // Function to format uptime
  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!isConnected) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg text-center">
        <p className="text-gray-300">Please connect your wallet to start a VPN node</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main card */}
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow space-y-6">
        {/* Header with status */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-white">Node Status</h3>
            <DashboardBadge variant={status.status === 'ACTIVE' ? "success" : "danger"} dot>
              {status.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </DashboardBadge>
            {status.status && ((status.status === 'ACTIVE') !== status.active) ? (
              <span className="text-xs text-yellow-400 ml-2">
                (Inconsistent status: DB={status.status}, Cache={status.active ? 'ACTIVE' : 'INACTIVE'})
              </span>
            ) : null}
          </div>
          <div className="flex items-center space-x-2">
            {/* Host Mode: Start/Stop Node Button */}
            {isHost && (
              <DashboardButton
                variant={status.active ? 'danger' : 'primary'}
                onClick={status.active ? stopNode : () => startNode(true)}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : status.active ? 'Stop Node' : 'Start Node'}
              </DashboardButton>
            )}

            {/* Client Mode: Disconnect Button (only when connected to a node) */}
            {!isHost && status.active && status.connectedToNode && (
              <DashboardButton
                variant="danger"
                onClick={disconnectFromNode}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Disconnect'}
              </DashboardButton>
            )}
          </div>
        </div>

        {/* Node type selection */}
        <div className="flex items-center justify-between mb-4 bg-black/20 backdrop-blur-sm p-3 rounded-md">
          <div className="flex items-center space-x-2">
            {isHost ? (
              <div className="p-2 rounded-full bg-green-500/20 backdrop-blur-sm">
                <Server className="w-5 h-5 text-green-400" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
                <Wifi className="w-5 h-5 text-blue-400" />
              </div>
            )}
            <span className="font-semibold text-white">
              {isHost ? 'Host Mode' : 'Client Mode'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isHost ? 'text-gray-400' : 'text-blue-400 font-semibold'}`}>Client</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isHost}
                onChange={() => {
                  // If the node is active, we need to stop it first
                  if (status.active) {
                    stopNode().then(() => {
                      const newIsHost = !isHost;
                      setIsHost(newIsHost);
                      localStorage.setItem('vpnNodeIsHost', newIsHost.toString());
                    });
                  } else {
                    const newIsHost = !isHost;
                    setIsHost(newIsHost);
                    localStorage.setItem('vpnNodeIsHost', newIsHost.toString());
                  }
                }}
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
            <span className={`text-sm ${isHost ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>Host</span>
            {status.active && (
              <span className="text-xs text-yellow-400 ml-2">(Will stop current node)</span>
            )}
          </div>
        </div>

        {/* Host Mode: Connected Clients (only when active and in host mode) */}
        {isHost && status.active && (
          <div className="mt-4 backdrop-blur-md bg-blue-900/20 border border-blue-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-blue-400">
                <Users className="w-4 h-4 mr-2" />
                <span className="font-semibold">Connected Clients ({status.connectedUsers || 0})</span>
              </div>
              <DashboardButton
                variant="secondary"
                onClick={() => {
                  fetchConnectedClients();
                }}
                disabled={isLoading}
                className="text-xs py-1 px-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </DashboardButton>
            </div>
            
            {status.connectedClients && status.connectedClients.length > 0 ? (
              <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                {status.connectedClients.map((client, index) => (
                  <div key={index} className="flex justify-between items-center backdrop-blur-sm bg-blue-900/10 border border-blue-700/30 p-3 rounded-md">
                    <div className="flex items-center">
                      <div className="p-1 rounded-full bg-blue-500/20 backdrop-blur-sm mr-2">
                        <Wifi className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-sm text-gray-300">
                        {client.walletAddress ? 
                          `${client.walletAddress.substring(0, 8)}...${client.walletAddress.substring(client.walletAddress.length - 6)}` : 
                          'Unknown Client'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-400">
                        {client.connectedSince ? 
                          `Connected: ${new Date(client.connectedSince).toLocaleTimeString()}` : 
                          'Recently connected'}
                      </div>
                      <DashboardButton
                        variant="danger"
                        onClick={() => disconnectClient(client.walletAddress)}
                        className="text-xs py-1 px-2"
                      >
                        <WifiOff className="w-3 h-3 mr-1" />
                        Disconnect
                      </DashboardButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-gray-400 text-sm backdrop-blur-sm bg-black/20 rounded-md p-3">
                {status.connectedUsers > 0 ? 
                  `${status.connectedUsers} clients connected. Click Refresh to see details.` : 
                  'No clients currently connected to your node.'}
              </div>
            )}
          </div>
        )}

        {/* Client connected status */}
        {!isHost && status.active && status.connectedToNode && (
          <div className="mt-4 backdrop-blur-md bg-green-900/20 border border-green-700/50 p-4 rounded-lg">
            <div className="flex items-center text-green-400">
              <div className="p-1 rounded-full bg-green-500/20 backdrop-blur-sm mr-2">
                <Server className="w-4 h-4" />
              </div>
              <span>Connected to node: {status.connectedToNode.substring(0, 8)}...{status.connectedToNode.substring(status.connectedToNode.length - 6)}</span>
            </div>
            {status.nodeIp && (
              <div className="mt-2 text-sm text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
                Node IP: {status.nodeIp}
              </div>
            )}
          </div>
        )}

        {/* Available Nodes List (always visible in client mode) */}
        {!isHost && (
          <div className="mt-4">
            <AvailableNodes onSelectNode={(nodeId) => {
              // When a node is selected, it will be connected automatically
              console.log(`Selected node: ${nodeId}`);
            }} />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center justify-between text-red-500 bg-red-100 p-3 rounded">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            {error.includes('authentication') && (
              <DashboardButton
                variant="secondary"
                onClick={() => {
                  // Forcer la reconnexion du wallet
                  localStorage.removeItem('walletAddress');
                  localStorage.removeItem('vpnNodeStatus');
                  window.location.reload();
                }}
                className="text-xs py-1 px-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reconnect
              </DashboardButton>
            )}
          </div>
        )}

        {/* Health status */}
        {status.active && (
          <div className={`flex items-center space-x-2 p-2 rounded ${
            status.healthStatus === 'healthy' ? 'bg-green-100 text-green-700' :
            status.healthStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            <Activity className="w-4 h-4" />
            <span className="capitalize">Health Status: {status.healthStatus || 'healthy'}</span>
          </div>
        )}

        {/* Detailed information */}
        {status.active && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne de gauche - Informations de base */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Signal className="w-4 h-4 text-blue-500" />
                <span className="text-gray-400">IP Address:</span>
                <span>{status.nodeIp || 'N/A'}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-400">Bandwidth:</span>
                <span>{(status.bandwidth || 0).toFixed(2)} MB/s</span>
              </div>

              <div className="flex items-center space-x-2">
                <Activity className={`w-4 h-4 ${getQualityColor(status.connectionQuality)}`} />
                <span className="text-gray-400">Connection Quality:</span>
                <span className={getQualityColor(status.connectionQuality)}>
                  {status.connectionQuality ? `${status.connectionQuality}%` : 'N/A'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-gray-400">Uptime:</span>
                <span>{status.metrics?.uptime ? formatUptime(status.metrics.uptime) : 'N/A'}</span>
              </div>
            </div>

            {/* Colonne de droite - Récompenses et métriques */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-500" />
                <span className="text-gray-400">Reward Tier:</span>
                <span className={getTierInfo(status.rewardTier).color}>
                  {getTierInfo(status.rewardTier).icon} {status.rewardTier || 'STARTER'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-400">Daily Earnings:</span>
                <span>{(status.earnings || 0).toFixed(3)} RWRD</span>
              </div>

              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4 text-blue-500" />
                <span className="text-gray-400">Connected Users:</span>
                <span>{status.connectedUsers || 0}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Signal className="w-4 h-4 text-red-500" />
                <span className="text-gray-400">Last Updated:</span>
                <span>{status.lastUpdated ? new Date(status.lastUpdated).toLocaleTimeString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}