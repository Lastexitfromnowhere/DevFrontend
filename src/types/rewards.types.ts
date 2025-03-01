// src/types/rewards.types.ts

export interface RewardStats {
    totalRewards: number;
    consecutiveDays: number;
    lastClaimDate: string | null;
    claimHistory: ClaimRecord[];
    referralBonus: number;
  }
  
  export interface ClaimRecord {
    date: string;
    amount: number;
    day: number;
    isHost: boolean;
  }
  
  export interface RewardsContextType {
    stats: RewardStats;
    claimRewards: () => Promise<void>;
    canClaim: () => boolean;
    claimAmount: number;
    showClaimPopup: boolean;
    setShowClaimPopup: (show: boolean) => void;
  }
  
  export interface VPNRewardStats {
    dailyEarnings: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    totalEarned: number;
    lastPayout: string;
  }