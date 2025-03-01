'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';

// Interface pour les stats de récompenses
interface RewardsStats {
  consecutiveDays: number;
  totalRewards: number;
}

// Interface du contexte de récompenses
interface RewardsContextType {
  stats: RewardsStats;
  claimRewards: () => void;
  canClaim: () => boolean;
}

// Créez le contexte avec une valeur par défaut complète
const RewardsContext = createContext<RewardsContextType>({
  stats: {
    consecutiveDays: 0,
    totalRewards: 0
  },
  claimRewards: () => {},
  canClaim: () => false
});

export const RewardsProvider = ({ children }: { children: ReactNode }) => {
  const [stats, setStats] = useState<RewardsStats>({
    consecutiveDays: 0,
    totalRewards: 0
  });

  const claimRewards = () => {
    // Logique pour réclamer les récompenses
  };

  const canClaim = () => {
    // Logique pour déterminer si les récompenses peuvent être réclamées
    return stats.consecutiveDays > 0; // Exemple simple
  };

  return (
    <RewardsContext.Provider value={{ 
      stats, 
      claimRewards, 
      canClaim 
    }}>
      {children}
    </RewardsContext.Provider>
  );
};

export const useRewardsContext = () => {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error('useRewardsContext must be used within RewardsProvider');
  }
  return context;
};