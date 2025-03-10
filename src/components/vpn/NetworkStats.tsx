import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Globe, Cpu, Wifi, Activity, Upload } from 'lucide-react';
import type { NetworkStats as NetworkStatsType } from '@/types/ecosystem.types';
import axios from 'axios';
import { config } from '@/config/env';

export default function NetworkStats() {
  const [stats, setStats] = useState<NetworkStatsType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fonction pour récupérer les données de l'API
    const fetchNetworkStats = async () => {
      try {
        const response = await axios.get(`${config.API_BASE_URL}/network-stats`);
        setStats(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques du réseau:', error);
        setError('Impossible de charger les statistiques du réseau');
        setLoading(false);
      }
    };

    fetchNetworkStats();
    // Mettre à jour toutes les 5 minutes
    const interval = setInterval(fetchNetworkStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Couleurs associées à l'état de santé du réseau
  const healthColors = {
    healthy: 'text-white',
    warning: 'text-yellow-400',
    critical: 'text-red-400'
  };

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-red-400 text-center">{error}</div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-white text-center">Chargement des statistiques réseau...</div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-4">
        <div className="text-yellow-400 text-center">Aucune donnée disponible</div>
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="text-white" size={24} />
          <h3 className="text-xl font-bold text-white">Network Statistics</h3>
        </div>
        <div className={`flex items-center space-x-1 ${stats && stats.networkHealth ? healthColors[stats.networkHealth] : 'text-gray-500'}`}>
          <Activity size={16} />
          <span className="text-sm capitalize">{stats && stats.networkHealth ? stats.networkHealth : 'unknown'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-700/50 rounded shadow-inner">
          <Cpu className="mx-auto mb-2 text-white" size={20} />
          <p className="text-sm text-gray-400">Total Nodes</p>
          <p className="text-xl font-bold text-white">{stats?.totalNodes || 0}</p>
        </div>
        <div className="text-center p-4 bg-gray-700/50 rounded shadow-inner">
          <Wifi className="mx-auto mb-2 text-white" size={20} />
          <p className="text-sm text-gray-400">Active Nodes</p>
          <p className="text-xl font-bold text-white">{stats?.activeNodes || 0}</p>
        </div>
        <div className="text-center p-4 bg-gray-700/50 rounded shadow-inner">
          <Upload className="mx-auto mb-2 text-white" size={20} />
          <p className="text-sm text-gray-400">Total Bandwidth</p>
          <p className="text-xl font-bold text-white">{stats?.totalBandwidth || 0} TB</p>
        </div>
        <div className="text-center p-4 bg-gray-700/50 rounded shadow-inner">
          <Activity className="mx-auto mb-2 text-white" size={20} />
          <p className="text-sm text-gray-400">Avg. Uptime</p>
          <p className="text-xl font-bold text-white">{stats?.averageUptime || 0}%</p>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        {`// Network data updates every 5 minutes`}
      </div>
    </Card>
  );
}
