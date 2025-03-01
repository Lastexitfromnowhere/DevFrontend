// src/hooks/useRewards.ts
import { useState, useCallback } from 'react';
import type { RewardStats } from '@/types/rewards.types';

export const useRewards = () => {
  const [stats, setStats] = useState<RewardStats>({
    totalRewards: 0,
    consecutiveDays: 0,
    lastClaimDate: null,
    claimHistory: [],
    referralBonus: 0
  });

  const claimRewards = useCallback(async () => {
    const newAmount = 10; // Base reward amount
    const now = new Date();

    setStats(prev => ({
      ...prev,
      totalRewards: prev.totalRewards + newAmount,
      consecutiveDays: prev.consecutiveDays + 1,
      lastClaimDate: now.toISOString(),
      claimHistory: [
        ...prev.claimHistory,
        {
          date: now.toISOString(),
          amount: newAmount,
          day: prev.consecutiveDays + 1,
          isHost: false
        }
      ]
    }));
  }, []);

  return {
    stats,
    claimRewards
  };
};