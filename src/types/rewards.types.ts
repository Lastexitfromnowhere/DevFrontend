export interface RewardStats {
  totalRewards: number;
  consecutiveDays: number;
  lastClaimDate: string | null;
  claimHistory: ClaimRecord[];
  referralBonus: number;
  canClaimToday: boolean;
  nextClaimTime: string | null;
}
export interface RewardClaim {
  amount: number;
  timestamp: string;
  status: 'pending' | 'success' | 'failed';
}
export interface ClaimRecord {
  date: string;
  amount: number;
  day: number;
  isHost: boolean;
}
export interface RewardsContextType {
  stats: RewardStats;
  isLoading: boolean;
  error: string | null;
  claimRewards: () => Promise<{ success: boolean; amount?: number; error?: string } | undefined>;
  fetchRewards: () => Promise<void>;
  canClaim: () => boolean;
}
export interface VPNRewardStats {
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalEarned: number;
  lastPayout: string;
}