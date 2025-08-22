import React from 'react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DashboardBadge } from '@/components/ui/DashboardBadge';
import { Calendar, Award } from 'lucide-react';
import type { ClaimRecord } from '@/types/rewards.types';
interface RewardsProgressProps {
  history: ClaimRecord[];
  days: number;
  total: number;
}
export function RewardsProgress({ history, days, total }: RewardsProgressProps) {
  const lastClaim = history[history.length - 1];
  return (
    <div className="space-y-4 backdrop-blur-md bg-black/40 border border-gray-700/50 p-4 rounded-lg shadow-lg transition-all duration-500">
      <div className="mb-2">
        <h3 className="text-white font-semibold mb-1">Progression mensuelle</h3>
        <ProgressBar
          progress={(days / 30) * 100}
          label="Monthly Progress"
          className="h-2 bg-black/30 border border-gray-700/30"
          progressClassName="bg-gradient-to-r from-blue-500 to-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 jours</span>
          <span>30 jours</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-3 transition-all duration-300 hover:bg-black/40">
          <div className="flex items-center mb-1">
            <div className="p-1.5 rounded-full bg-blue-500/20 backdrop-blur-sm mr-2">
              <Calendar className="text-blue-400 h-4 w-4" />
            </div>
            <p className="text-gray-300 text-sm">Dernière réclamation</p>
          </div>
          <p className="text-white font-medium">
            {lastClaim ? new Date(lastClaim.date).toLocaleDateString() : 'Jamais'}
          </p>
        </div>
        <div className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-3 transition-all duration-300 hover:bg-black/40">
          <div className="flex items-center mb-1">
            <div className="p-1.5 rounded-full bg-purple-500/20 backdrop-blur-sm mr-2">
              <Award className="text-purple-400 h-4 w-4" />
            </div>
            <p className="text-gray-300 text-sm">Total gagné</p>
          </div>
          <p className="text-white font-medium">{total.toFixed(2)} <span className="text-purple-400">RWRD</span></p>
        </div>
      </div>
      <div className="text-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md mt-2">
        {`
      </div>
    </div>
  );
}