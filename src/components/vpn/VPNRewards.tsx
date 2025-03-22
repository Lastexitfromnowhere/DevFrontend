// src/components/vpn/VPNRewards.tsx
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TrendingUp, Calendar, Award } from 'lucide-react';
import { DashboardBadge } from '@/components/ui/DashboardBadge';

interface VPNRewardsProps {
  earnings: number;
}

export default function VPNRewards({ earnings }: VPNRewardsProps) {
  const monthlyGoal = 1000;
  const progress = (earnings / monthlyGoal) * 100;

  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
          <Award className="text-blue-400" size={20} />
        </div>
        <h3 className="text-xl font-semibold text-white">Récompenses du nœud</h3>
      </div>

      <div className="text-center p-6 bg-black/30 backdrop-blur-sm rounded-lg border border-gray-700/30">
        <p className="text-3xl font-bold text-white">
          {earnings.toFixed(2)} <span className="text-blue-400">RWRD</span>
        </p>
        <p className="text-sm text-gray-300 mt-1">Total gagné</p>
      </div>

      <div className="space-y-4">
        <div className="bg-black/20 backdrop-blur-sm p-3 rounded-lg border border-gray-700/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Progression vers l'objectif mensuel</span>
            <DashboardBadge 
              variant={progress < 30 ? "danger" : progress < 70 ? "warning" : "success"} 
              size="sm"
            >
              {progress.toFixed(0)}%
            </DashboardBadge>
          </div>
          <ProgressBar
            progress={progress}
            showPercentage={false}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30 transition-all duration-300 hover:bg-black/30">
            <div className="p-2 rounded-full bg-blue-500/10 backdrop-blur-sm mx-auto mb-2 w-fit">
              <Calendar className="text-blue-400" size={16} />
            </div>
            <p className="text-gray-300 text-xs">Aujourd'hui</p>
            <p className="text-white text-sm font-medium">{(earnings * 0.1).toFixed(2)} RWRD</p>
          </div>
          <div className="text-center p-3 bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700/30 transition-all duration-300 hover:bg-black/30">
            <div className="p-2 rounded-full bg-blue-500/10 backdrop-blur-sm mx-auto mb-2 w-fit">
              <TrendingUp className="text-blue-400" size={16} />
            </div>
            <p className="text-gray-300 text-xs">Cette semaine</p>
            <p className="text-white text-sm font-medium">{(earnings * 0.4).toFixed(2)} RWRD</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
