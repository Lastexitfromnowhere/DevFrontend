// src/hooks/useRewards.ts
import { useState, useCallback, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import axios from 'axios';
import config from '@/config';
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

  // Fonction pour récupérer les récompenses disponibles
  const fetchRewards = useCallback(async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${config.API_BASE_URL}/api/dailyClaims`, {
        headers: {
          'X-Wallet-Address': account
        }
      });

      if (response.data.success) {
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
      } else {
        throw new Error(response.data.message || 'Failed to fetch rewards');
      }
    } catch (err: any) {
      console.error('Error fetching rewards:', err);
      setError(err.response?.data?.message || err.message || 'Error fetching rewards');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, account]);

  // Fonction pour réclamer les récompenses quotidiennes
  const claimRewards = useCallback(async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${config.API_BASE_URL}/api/dailyClaims/claim`, {
        walletAddress: account
      });

      if (response.data.success) {
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
        throw new Error(response.data.message || 'Failed to claim rewards');
      }
    } catch (err: any) {
      console.error('Error claiming rewards:', err);
      setError(err.response?.data?.message || err.message || 'Error claiming rewards');
      return {
        success: false,
        error: err.response?.data?.message || err.message || 'Error claiming rewards'
      };
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, account]);

  // Fonction pour vérifier si l'utilisateur peut réclamer des récompenses
  const canClaim = useCallback(() => {
    return stats.canClaimToday;
  }, [stats.canClaimToday]);

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
    claimRewards,
    fetchRewards,
    canClaim
  };
};