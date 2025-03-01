"use client";

// src/components/rewards/DailyRewards.tsx
import React from 'react';
import { useRewardsContext } from '@/contexts/RewardsContext';
import { Card } from '@/components/ui/Card';
import { TerminalButton } from '@/components/ui/terminal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Sparkles, Calendar } from 'lucide-react';

export function DailyRewards() {
  const { stats, claimRewards, canClaim } = useRewardsContext();

  return (
    <Card variant="terminal" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg text-green-300">Daily Rewards</h3>
        </div>
        <TerminalButton
          onClick={() => claimRewards()}
          disabled={!canClaim()}
          className="text-xs"
        >
          {canClaim() ? '$ claim_rewards' : '// Claimed today'}
        </TerminalButton>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-black/20 rounded">
          <Calendar className="w-5 h-5 mx-auto mb-2 text-green-400" />
          <p className="text-sm text-green-400">Streak</p>
          <p className="text-xl font-bold text-green-300">
            {stats.consecutiveDays} days
          </p>
        </div>
        <div className="text-center p-4 bg-black/20 rounded">
          <Sparkles className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
          <p className="text-sm text-green-400">Total Earned</p>
          <p className="text-xl font-bold text-green-300">
            {stats.totalRewards.toFixed(2)}
          </p>
        </div>
      </div>

      <ProgressBar
        progress={(stats.consecutiveDays / 30) * 100}
        label="Monthly Progress"
      />
    </Card>
  );
}
