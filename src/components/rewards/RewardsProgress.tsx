// src/components/rewards/RewardsProgress.tsx
import React from 'react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { ClaimRecord } from '@/types/rewards.types';

interface RewardsProgressProps {
  history: ClaimRecord[];
  days: number;
  total: number;
}

export function RewardsProgress({ history, days, total }: RewardsProgressProps) {
  const lastClaim = history[history.length - 1];

  return (
    <div className="space-y-4">
      <ProgressBar
        progress={(days / 30) * 100}
        label="Monthly Progress"
      />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-black/20 rounded p-2">
          <p className="text-green-400">Last Claim</p>
          <p className="text-green-300">
            {lastClaim ? new Date(lastClaim.date).toLocaleDateString() : 'Never'}
          </p>
        </div>
        <div className="bg-black/20 rounded p-2">
          <p className="text-green-400">Total Earned</p>
          <p className="text-green-300">{total.toFixed(2)} RWRD</p>
        </div>
      </div>
    </div>
  );
}