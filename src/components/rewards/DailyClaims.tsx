import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { DashboardButton } from '../ui/DashboardButton';
import { DashboardBadge } from '../ui/DashboardBadge';
import { useWalletContext } from '@/contexts/WalletContext';
import { Award, Clock, AlertTriangle, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { config } from '@/config/env';
import axios from 'axios';
import { Spinner } from '../ui/Spinner';

// Configuration de base d'Axios
const api = axios.create({
  timeout: config.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter l'adresse du wallet à toutes les requêtes
api.interceptors.request.use(
  (config) => {
    // Récupérer l'adresse du wallet depuis le localStorage
    const walletAddress = localStorage.getItem('walletAddress');
    
    // Si l'adresse existe, l'ajouter aux en-têtes
    if (walletAddress) {
      // S'assurer que headers existe
      config.headers = config.headers || {};
      config.headers['X-Wallet-Address'] = walletAddress;
      config.headers['Authorization'] = `Bearer ${walletAddress}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface RewardsState {
  availableRewards: number;
  lastClaimDate: string | null;
  canClaim: boolean;
  nextClaimTime: string | null;
  claimHistory: Array<{
    amount: number;
    timestamp: string;
    status: string;
  }>;
}

export default function DailyClaims() {
  const { isConnected, account } = useWalletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardsState>({
    availableRewards: 0,
    lastClaimDate: null,
    canClaim: false,
    nextClaimTime: null,
    claimHistory: []
  });

  // Fonction pour récupérer les récompenses disponibles
  const fetchRewards = async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching rewards from:', `${config.API_BASE_URL}/dailyClaims`);
      
      const response = await api.get(`${config.API_BASE_URL}/dailyClaims`, {
        params: {
          walletAddress: account
        },
        headers: {
          'X-Wallet-Address': account,
          'Authorization': `Bearer ${account}`
        }
      });
      
      console.log('API response:', response);
      
      // Type assertion pour response.data
      const responseData = response.data as any;
      
      if (responseData.success) {
        setRewards({
          availableRewards: responseData.availableRewards || 0,
          lastClaimDate: responseData.lastClaimDate,
          canClaim: responseData.canClaim || false,
          nextClaimTime: responseData.nextClaimTime,
          claimHistory: responseData.claimHistory || []
        });
        setError(null);
      } else {
        setError(responseData.message || 'Failed to fetch rewards');
      }
    } catch (error: any) {
      console.error('Error fetching rewards:', error);
      setError(error.response?.data?.message || error.message || 'Error fetching rewards');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour réclamer les récompenses quotidiennes
  const claimDailyRewards = async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsClaiming(true);
    try {
      console.log('Claiming daily rewards from:', `${config.API_BASE_URL}/dailyClaims/claim`);
      
      const response = await api.post(`${config.API_BASE_URL}/dailyClaims/claim`, null, {
        params: {
          walletAddress: account
        },
        headers: {
          'X-Wallet-Address': account,
          'Authorization': `Bearer ${account}`
        }
      });
      
      console.log('API response:', response);
      
      // Type assertion pour response.data
      const responseData = response.data as any;
      
      if (responseData.success) {
        // Mettre à jour l'état des récompenses après une réclamation réussie
        setRewards({
          ...rewards,
          availableRewards: 0, // Réinitialiser à 0 après réclamation
          lastClaimDate: new Date().toISOString(),
          canClaim: false,
          nextClaimTime: responseData.nextClaimTime,
          claimHistory: [
            {
              amount: responseData.claimedAmount || rewards.availableRewards,
              timestamp: new Date().toISOString(),
              status: 'success'
            },
            ...rewards.claimHistory
          ]
        });
        setError(null);
      } else {
        setError(responseData.message || 'Failed to claim rewards');
      }
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      setError(error.response?.data?.message || error.message || 'Error claiming rewards');
    } finally {
      setIsClaiming(false);
    }
  };

  // Calculer le temps restant avant la prochaine réclamation
  const getTimeRemaining = (): string => {
    if (!rewards.nextClaimTime) return 'N/A';
    
    const now = new Date();
    const nextClaim = new Date(rewards.nextClaimTime);
    const diffMs = nextClaim.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Available now';
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };

  // Récupérer les récompenses au chargement du composant
  useEffect(() => {
    if (isConnected && account) {
      fetchRewards();
      
      // Configurer un intervalle pour rafraîchir les récompenses toutes les minutes
      const interval = setInterval(() => {
        fetchRewards();
      }, 60000); // 1 minute
      
      return () => clearInterval(interval);
    }
  }, [isConnected, account]);

  if (!isConnected) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg text-center">
        <p className="text-gray-400">Veuillez connecter votre portefeuille pour voir vos récompenses</p>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow space-y-6">
      {/* En-tête avec titre */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-yellow-500/20 backdrop-blur-sm">
            <Award className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Récompenses quotidiennes</h3>
        </div>
        <DashboardButton
          variant="secondary"
          onClick={fetchRewards}
          loading={isLoading}
          icon={<RefreshCw className="w-3 h-3" />}
          size="sm"
        >
          Actualiser
        </DashboardButton>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="flex items-center bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-md backdrop-blur-sm">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Récompenses disponibles */}
      <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-4 transition-all duration-300">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-gray-300 font-semibold mb-1">Récompenses disponibles</h4>
            <div className="text-2xl font-bold text-white">
              {isLoading ? <Spinner size="sm" /> : <><span className="text-yellow-400">{rewards.availableRewards.toFixed(3)}</span> RWRD</>}
            </div>
          </div>
          <DashboardButton
            variant="primary"
            onClick={claimDailyRewards}
            loading={isClaiming}
            disabled={!rewards.canClaim || isClaiming}
            icon={<Award className="w-4 h-4" />}
          >
            Réclamer
          </DashboardButton>
        </div>
        
        {/* Temps avant prochaine réclamation */}
        <div className="mt-3 flex items-center text-sm bg-black/20 backdrop-blur-sm p-2 rounded-md">
          <Clock className="w-4 h-4 mr-1 text-blue-400" />
          {rewards.canClaim ? (
            <span className="text-green-400">Prêt à réclamer !</span>
          ) : (
            <span className="text-gray-300">Prochaine réclamation dans : <span className="text-blue-400 font-medium">{getTimeRemaining()}</span></span>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3">
        <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-3 transition-all duration-300 hover:bg-black/40">
          <div className="flex items-center mb-1">
            <div className="p-1.5 rounded-full bg-blue-500/20 backdrop-blur-sm mr-2">
              <Calendar className="text-blue-400 h-4 w-4" />
            </div>
            <p className="text-gray-300 text-sm">Dernière réclamation</p>
          </div>
          <p className="text-white font-medium">
            {rewards.lastClaimDate ? new Date(rewards.lastClaimDate).toLocaleDateString() : 'Jamais'}
          </p>
        </div>
        <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-3 transition-all duration-300 hover:bg-black/40">
          <div className="flex items-center mb-1">
            <div className="p-1.5 rounded-full bg-green-500/20 backdrop-blur-sm mr-2">
              <TrendingUp className="text-green-400 h-4 w-4" />
            </div>
            <p className="text-gray-300 text-sm">Historique</p>
          </div>
          <p className="text-white font-medium">{rewards.claimHistory.length} <span className="text-gray-400">réclamations</span></p>
        </div>
      </div>

      {/* Historique des réclamations */}
      {rewards.claimHistory.length > 0 && (
        <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">Historique des réclamations</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {rewards.claimHistory.map((claim, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-black/20 backdrop-blur-sm rounded-md border border-gray-700/20">
                <div className="flex items-center">
                  <Award className="w-3 h-3 text-yellow-400 mr-2" />
                  <span className="text-sm text-gray-300">{new Date(claim.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-white mr-2">{claim.amount.toFixed(3)}</span>
                  <DashboardBadge variant={claim.status === 'success' ? 'success' : 'danger'} size="sm">
                    {claim.status === 'success' ? 'Réussi' : 'Échoué'}
                  </DashboardBadge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
        {`// Connectez-vous quotidiennement pour maximiser vos récompenses`}
      </div>
    </Card>
  );
}
