import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { TerminalButton } from '../ui/terminal/TerminalButton';
import { useWalletContext } from '@/contexts/WalletContext';
import { Award, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
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
        headers: {
          'X-Wallet-Address': account,
          'Authorization': `Bearer ${account}`
        }
      });
      
      console.log('API response:', response);
      
      if (response.data.success) {
        setRewards({
          availableRewards: response.data.availableRewards || 0,
          lastClaimDate: response.data.lastClaimDate,
          canClaim: response.data.canClaim || false,
          nextClaimTime: response.data.nextClaimTime,
          claimHistory: response.data.claimHistory || []
        });
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch rewards');
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
      
      const response = await api.post(`${config.API_BASE_URL}/dailyClaims/claim`, {
        walletAddress: account
      });
      
      console.log('API response:', response);
      
      if (response.data.success) {
        // Mettre à jour l'état des récompenses après une réclamation réussie
        setRewards({
          ...rewards,
          availableRewards: 0, // Réinitialiser à 0 après réclamation
          lastClaimDate: new Date().toISOString(),
          canClaim: false,
          nextClaimTime: response.data.nextClaimTime,
          claimHistory: [
            {
              amount: response.data.claimedAmount || rewards.availableRewards,
              timestamp: new Date().toISOString(),
              status: 'success'
            },
            ...rewards.claimHistory
          ]
        });
        setError(null);
      } else {
        setError(response.data.message || 'Failed to claim rewards');
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
      <Card className="text-center p-6">
        <p className="text-gray-500">Please connect your wallet to view rewards</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      {/* En-tête avec titre */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Daily Rewards</h3>
          <Award className="w-5 h-5 text-yellow-500" />
        </div>
        <TerminalButton
          variant="secondary"
          onClick={fetchRewards}
          loading={isLoading}
          className="text-xs py-1 px-2"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </TerminalButton>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="flex items-center text-red-500 bg-red-100 p-3 rounded">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Récompenses disponibles */}
      <div className="bg-gray-900/30 border border-gray-700 rounded p-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-orange-400 font-semibold mb-1">Available Rewards</h4>
            <div className="text-2xl font-bold text-white">
              {isLoading ? <Spinner size="sm" /> : `${rewards.availableRewards.toFixed(3)} RWRD`}
            </div>
          </div>
          <TerminalButton
            variant="primary"
            onClick={claimDailyRewards}
            loading={isClaiming}
            disabled={!rewards.canClaim || isClaiming}
          >
            Claim Rewards
          </TerminalButton>
        </div>
        
        {/* Temps avant prochaine réclamation */}
        <div className="mt-3 flex items-center text-sm text-gray-400">
          <Clock className="w-4 h-4 mr-1" />
          {rewards.canClaim ? (
            <span className="text-green-400">Ready to claim!</span>
          ) : (
            <span>Next claim available in: {getTimeRemaining()}</span>
          )}
        </div>
      </div>

      {/* Historique des réclamations */}
      {rewards.claimHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Recent Claims</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {rewards.claimHistory.map((claim, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-800 p-2 rounded text-sm">
                <div className="flex items-center">
                  <Award className="w-3 h-3 mr-2 text-yellow-500" />
                  <span>{claim.amount.toFixed(3)} RWRD</span>
                </div>
                <div className="text-gray-400">
                  {new Date(claim.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
