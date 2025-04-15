import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { DashboardButton } from '../ui/DashboardButton';
import { DashboardBadge } from '../ui/DashboardBadge';
import { useWalletContext } from '@/contexts/WalletContext';
import { Award, Clock, AlertTriangle, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { config } from '@/config/env';
import axios from 'axios';
import { Spinner } from '../ui/Spinner';
import { authService } from '@/services/authService';

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
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow space-y-6">
      {/* En-tête avec titre */}
      <div className="flex justify-center items-center mb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-yellow-500/20 backdrop-blur-sm">
            <Award className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Récompenses quotidiennes</h3>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="flex items-center bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-md backdrop-blur-sm">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Solde actuel */}
      <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-6 transition-all duration-300">
        <div className="flex flex-col items-center text-center mb-4">
          <h4 className="text-gray-300 font-semibold mb-2">Votre solde actuel</h4>
          <div className="text-4xl font-bold text-white bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
            {isLoading ? <Spinner size="lg" /> : totalBalance.toFixed(3)}
          </div>
          <div className="text-lg font-medium text-gray-400 mt-1">RWRD</div>
          
          {rewards.availableRewards > 0 && (
            <div className="mt-2 text-sm text-gray-300">
              <span className="text-green-400 font-medium">{rewards.availableRewards.toFixed(3)}</span> RWRD disponibles à réclamer
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-4">
          <DashboardButton
            variant="primary"
            onClick={claimDailyRewards}
            loading={isClaiming}
            disabled={!rewards.canClaim || isClaiming}
            icon={<Award className="w-4 h-4" />}
            className="w-full max-w-xs"
          >
            {rewards.canClaim ? "Réclamer ma récompense quotidienne" : "Récompense déjà réclamée"}
          </DashboardButton>
        </div>
        
        {/* Temps avant prochaine réclamation */}
        <div className="mt-4 flex items-center justify-center text-sm bg-black/20 backdrop-blur-sm p-3 rounded-md">
          <Clock className="w-4 h-4 mr-2 text-blue-400" />
          {rewards.canClaim ? (
            <span className="text-green-400 font-medium">Prêt à réclamer maintenant !</span>
          ) : (
            <span className="text-gray-300">Prochaine réclamation dans : <span className="text-blue-400 font-medium">{getTimeRemaining()}</span></span>
          )}
        </div>
      </div>

      {/* Informations complémentaires */}
      <div className="grid grid-cols-2 gap-3">
        <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-4 transition-all duration-300 hover:bg-black/40">
          <div className="flex items-center mb-2">
            <div className="p-1.5 rounded-full bg-blue-500/20 backdrop-blur-sm mr-2">
              <Calendar className="text-blue-400 h-4 w-4" />
            </div>
            <p className="text-gray-300 text-sm">Dernière réclamation</p>
          </div>
          <p className="text-white font-medium text-center mt-1">
            {rewards.lastClaimDate ? new Date(rewards.lastClaimDate).toLocaleDateString() : 'Jamais'}
          </p>
        </div>
        <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-4 transition-all duration-300 hover:bg-black/40">
          <div className="flex items-center mb-2">
            <div className="p-1.5 rounded-full bg-green-500/20 backdrop-blur-sm mr-2">
              <TrendingUp className="text-green-400 h-4 w-4" />
            </div>
            <p className="text-gray-300 text-sm">Taux journalier</p>
          </div>
          <p className="text-white font-medium text-center mt-1">+1.000 <span className="text-gray-400">RWRD / jour</span></p>
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
        {`// Connectez-vous quotidiennement pour maximiser vos récompenses`}
      </div>
    </Card>
  );
}
