'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useRewards } from '@/hooks/useRewards';
import { RewardsContextType } from '@/types/rewards.types';

// Créez le contexte avec une valeur par défaut
const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider = ({ children }: { children: ReactNode }) => {
  const rewardsData = useRewards();

  return (
    <RewardsContext.Provider value={rewardsData}>
      {children}
    </RewardsContext.Provider>
  );
};

export const useRewardsContext = (): RewardsContextType => {
  const context = useContext(RewardsContext);
  if (context === undefined) {
    throw new Error('useRewardsContext must be used within a RewardsProvider');
  }
  return context;
};