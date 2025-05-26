import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { DashboardButton } from '../ui/DashboardButton';
import { useWalletContext } from '@/contexts/WalletContext';
import { Calendar, TrendingUp } from 'lucide-react';
import { config } from '@/config/env';
import axios from 'axios';
import { Spinner } from '../ui/Spinner';
import { authService } from '@/services/authService';
import Image from 'next/image';

// URL de base pour les requêtes dailyClaims
const DAILY_CLAIMS_API_BASE = `${config.API_BASE_URL}/dailyClaims`;

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
      console.log('Fetching rewards from:', DAILY_CLAIMS_API_BASE);
      
      // Vérifier que le token est valide et le rafraîchir si nécessaire
      await authService.refreshTokenIfNeeded();
      
      // Utiliser l'adresse du wallet stockée dans le token JWT pour éviter les erreurs 403
      const tokenWalletAddress = authService.getWalletAddressFromToken();
      let walletAddressToUse = account;
      
      // Si les adresses ne correspondent pas, utiliser celle du token pour éviter l'erreur 403
      if (tokenWalletAddress && tokenWalletAddress !== account) {
        console.warn(`L'adresse fournie (${account}) ne correspond pas à celle du token (${tokenWalletAddress}). Utilisation de l'adresse du token.`);
        walletAddressToUse = tokenWalletAddress;
      }
      
      // Vérifier si le token JWT correspond à l'adresse du wallet
      const tokenMatch = await authService.verifyTokenWalletMatch();
      console.log('Le token correspond à l\'adresse du wallet:', tokenMatch);
      
      // Obtenir les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      console.log('Entêtes d\'authentification:', headers);
      console.log('Adresse du wallet utilisée pour la requête:', walletAddressToUse);
      
      const response = await axios.get(DAILY_CLAIMS_API_BASE, {
        headers,
        params: { walletAddress: walletAddressToUse }
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
      } else {
        setError(responseData.message || 'Failed to fetch rewards');
      }
    } catch (error: any) {
      console.error('Error fetching rewards:', error);
      setError(error.message || 'Failed to fetch rewards');
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
      // Vérifier que le token est valide et le rafraîchir si nécessaire
      await authService.refreshTokenIfNeeded();
      
      // Utiliser l'adresse du wallet stockée dans le token JWT pour éviter les erreurs 403
      const tokenWalletAddress = authService.getWalletAddressFromToken();
      let walletAddressToUse = account;
      
      // Si les adresses ne correspondent pas, utiliser celle du token pour éviter l'erreur 403
      if (tokenWalletAddress && tokenWalletAddress !== account) {
        console.warn(`L'adresse fournie (${account}) ne correspond pas à celle du token (${tokenWalletAddress}). Utilisation de l'adresse du token.`);
        walletAddressToUse = tokenWalletAddress;
      }
      
      // Obtenir les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      console.log('Entêtes d\'authentification pour claim:', headers);
      console.log('Adresse du wallet utilisée pour la requête de claim:', walletAddressToUse);
      
      const response = await axios.post(`${DAILY_CLAIMS_API_BASE}/claim`, null, {
        headers,
        params: { walletAddress: walletAddressToUse }
      });
      
      console.log('Claim response:', response);
      
      // Type assertion pour response.data
      const responseData = response.data as any;
      
      if (responseData.success) {
        // Mettre à jour les récompenses après réclamation
        await fetchRewards();
      } else {
        setError(responseData.message || 'Failed to claim rewards');
      }
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      setError(error.message || 'Failed to claim rewards');
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
  
  // Calculer le solde total à partir de l'historique des réclamations
  const calculateTotalBalance = (): number => {
    // Si l'historique des réclamations est vide, retourner les récompenses disponibles
    if (!rewards.claimHistory || rewards.claimHistory.length === 0) {
      return rewards.availableRewards;
    }
    
    // Calculer la somme de toutes les réclamations réussies
    const totalClaimed = rewards.claimHistory
      .filter(claim => claim.status === 'success')
      .reduce((sum, claim) => sum + claim.amount, 0);
    
    // Ajouter les récompenses disponibles au total réclamé
    return totalClaimed + rewards.availableRewards;
  };
  
  // Obtenir le solde total
  const totalBalance = calculateTotalBalance();

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
    <Card className="relative overflow-hidden backdrop-blur-md bg-black/70 border border-gray-700/50 p-6 rounded-3xl shadow-lg transition-all duration-500 space-y-6 max-w-md mx-auto">
      {/* Titre */}
      <div className="text-center">
        <h3 className="text-3xl font-bold text-[#3DAEFF] tracking-wider">DAILY REWARD</h3>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="flex items-center bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-md backdrop-blur-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex">
        {/* Image du renard */}
        <div className="flex-shrink-0 relative w-1/2">
          <Image 
            src="/image.png" 
            alt="Fox character" 
            width={200} 
            height={300}
            className="object-contain"
          />
        </div>

        {/* Informations de récompense */}
        <div className="flex-grow flex flex-col justify-center space-y-6">
          {/* Wallet connecté */}
          <div>
            <p className="text-gray-400 text-lg mb-1">Connected wallet</p>
            <div className="bg-black/30 border border-gray-700/50 rounded-xl px-4 py-2">
              <p className="text-white font-medium truncate">
                {isLoading ? <Spinner size="sm" /> : account ? `${account.substring(0, 4)}...${account.substring(account.length - 4)}` : 'Not connected'}
              </p>
            </div>
          </div>

          {/* Récompenses disponibles */}
          <div>
            <p className="text-gray-400 text-lg mb-1">Available</p>
            <div className="text-[#00FF88] text-5xl font-bold">
              {isLoading ? <Spinner size="lg" /> : totalBalance.toFixed(3)} <span className="text-2xl">RWRD</span>
            </div>
            {rewards.availableRewards > 0 && rewards.availableRewards !== totalBalance && (
              <div className="text-sm text-gray-300 mt-1">
                <span className="text-blue-400">{rewards.availableRewards.toFixed(3)}</span> ready to claim
              </div>
            )}
          </div>

          {/* Bouton de réclamation */}
          <div>
            <button
              onClick={claimDailyRewards}
              disabled={!rewards.canClaim || isClaiming}
              className="w-full bg-[#0066CC] hover:bg-[#0055AA] text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xl"
            >
              {isClaiming ? <Spinner size="sm" /> : 'Claim'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer avec date et taux journalier */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-700/30 text-gray-400">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
        </div>
        <div className="flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          <span>1.000 / day</span>
        </div>
      </div>
    </Card>
  );
}
