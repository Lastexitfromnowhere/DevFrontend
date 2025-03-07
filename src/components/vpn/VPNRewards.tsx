// src/components/vpn/VPNRewards.tsx
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TrendingUp, Calendar } from 'lucide-react';

interface VPNRewardsProps {
  earnings: number;
}

export default function VPNRewards({ earnings }: VPNRewardsProps) {
  const monthlyGoal = 1000;
  const progress = (earnings / monthlyGoal) * 100;

  return (
    <Card className="space-y-4">
      <div className="flex items-center space-x-2">
        <TrendingUp className="text-green-400" size={24} />
        <h3 className="text-xl font-bold text-green-300">Node Rewards</h3>
      </div>

      <div className="text-center p-6 bg-black/20 rounded">
        <p className="text-3xl font-bold text-green-300">
          {earnings.toFixed(2)} RWRD
        </p>
        <p className="text-sm text-green-500">Total Earned</p>
      </div>

      <div className="space-y-4">
        <ProgressBar
          progress={progress}
          label="Monthly Goal Progress"
          showPercentage
        />
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-center p-2 bg-black/20 rounded">
            <Calendar className="mx-auto mb-1 text-green-400" size={16} />
            <p className="text-green-500">Today</p>
            <p className="text-green-300">{(earnings * 0.1).toFixed(2)} RWRD</p>
          </div>
          <div className="text-center p-2 bg-black/20 rounded">
            <TrendingUp className="mx-auto mb-1 text-green-400" size={16} />
            <p className="text-green-500">This Week</p>
            <p className="text-green-300">{(earnings * 0.4).toFixed(2)} RWRD</p>
          </div>
        </div>
      </div>
    </Card>
  );
}