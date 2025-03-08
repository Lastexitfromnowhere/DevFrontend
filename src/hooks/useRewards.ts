// src/hooks/useRewards.ts
import { useState, useCallback, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { apiService } from '@/services/apiService';
import type { RewardStats, RewardClaim } from '@/types/rewards.types';

export const useRewards = () => {
  const { isConnected, account } = useWalletContext();
  const [stats, setStats] = useState<RewardStats>({
    totalRewards: 0,
    consecutiveDays: 0,
    lastClaimDate: null,
    claimHistory: [],
    referralBonus: 0,
    canClaimToday: false,
    nextClaimTime: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Écouter les changements d'état de connexion
  useEffect(() => {
    const unsubscribe = apiService.addOfflineListener((offline) => {
      setIsOffline(offline);
    });
    
    return () => unsubscribe();
  }, []);

  // Fonction pour récupérer les récompenses disponibles
  const fetchRewards = useCallback(async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.fetchRewards(account);
      
      if (response.status === 'success' && response.data) {
        const { 
          canClaimToday, 
          lastClaimDate, 
          nextClaimTime, 
          claimHistory, 
          totalClaimed,
          consecutiveDays 
        } = response.data;

        setStats({
          totalRewards: totalClaimed || 0,
          consecutiveDays: consecutiveDays || 0,
          lastClaimDate: lastClaimDate,
          nextClaimTime: nextClaimTime,
          canClaimToday: canClaimToday,
          claimHistory: claimHistory || [],
          referralBonus: 0 // À implémenter plus tard
        });
      } else if (response.status === 'offline') {
        // En mode hors ligne, on garde les données existantes
        console.warn('Impossible de récupérer les récompenses: mode hors ligne');
        setError('Le serveur est temporairement indisponible. Certaines fonctionnalités peuvent être limitées.');
      } else {
        throw new Error(response.error || 'Failed to fetch rewards');
      }
    } catch (err: any) {
      console.error('Error fetching rewards:', err);
      setError(err.message || 'Error fetching rewards');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, account]);

  // Fonction pour réclamer les récompenses quotidiennes
  const claimRewards = useCallback(async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }

    if (isOffline) {
      setError('Cannot claim rewards while offline');
      return { success: false, error: 'Cannot claim rewards while offline' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.claimRewards(account);
      
      if (response.status === 'success' && response.data && response.data.success) {
        const { 
          claimedAmount, 
          nextClaimTime, 
          totalClaimed,
          consecutiveDays,
          claimHistory 
        } = response.data;

        setStats(prev => ({
          ...prev,
          totalRewards: totalClaimed || prev.totalRewards + claimedAmount,
          consecutiveDays: consecutiveDays || prev.consecutiveDays + 1,
          lastClaimDate: new Date().toISOString(),
          nextClaimTime: nextClaimTime,
          canClaimToday: false,
          claimHistory: claimHistory || [
            ...(prev.claimHistory || []),
            {
              date: new Date().toISOString(),
              amount: claimedAmount,
              day: prev.consecutiveDays + 1,
              isHost: false
            }
          ]
        }));

        return {
          success: true,
          amount: claimedAmount
        };
      } else {
        throw new Error(response.error || response.data?.message || 'Failed to claim rewards');
      }
    } catch (err: any) {
      console.error('Error claiming rewards:', err);
      setError(err.message || 'Error claiming rewards');
      return {
        success: false,
        error: err.message || 'Error claiming rewards'
      };
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, account, isOffline]);

  // Fonction pour vérifier si l'utilisateur peut réclamer des récompenses
  const canClaim = useCallback(() => {
    return stats.canClaimToday && !isOffline;
  }, [stats.canClaimToday, isOffline]);

  // Récupérer les récompenses au chargement et lorsque le portefeuille change
  useEffect(() => {
    if (isConnected && account) {
      fetchRewards();
    }
  }, [isConnected, account, fetchRewards]);

  return {
    stats,
    isLoading,
    error,
    isOffline,
    claimRewards,
    fetchRewards,
    canClaim
  };
};