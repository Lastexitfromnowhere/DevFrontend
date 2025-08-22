import { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { getVPNRewards, VPNRewardsData } from '@/services/vpnService';
interface UseVPNRewardsReturn {
  rewards: VPNRewardsData;
  isLoading: boolean;
  error: string | null;
  refreshRewards: () => Promise<void>;
}
export function useVPNRewards(): UseVPNRewardsReturn {
  const { isConnected } = useWalletContext();
  const [rewards, setRewards] = useState<VPNRewardsData>({
    totalEarnings: 0,
    dailyEarnings: 0,
    weeklyEarnings: 0,
    monthlyGoal: 1000,
    progress: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRewards = async () => {
    if (!isConnected) {
      setError('Wallet not connected. Please connect your wallet to view daily rewards.');
      return;
    }
    setIsLoading(true);
    try {
      const rewardsData = await getVPNRewards();
      setRewards(rewardsData);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching daily rewards:', error);
      setError(error.message || 'Failed to fetch daily rewards');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (isConnected) {
      fetchRewards();
    }
  }, [isConnected]);
  return {
    rewards,
    isLoading,
    error,
    refreshRewards: fetchRewards
  };
}
export default useVPNRewards;
