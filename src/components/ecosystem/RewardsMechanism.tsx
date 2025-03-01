// src/components/ecosystem/RewardsMechanism.tsx
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Shield, Zap, Calendar, Star } from 'lucide-react';

export default function RewardsMechanism({ onClose }: { onClose: () => void }) {
  const rewardsSections = [
    {
      icon: Shield,
      title: "Distribution Principles",
      content: (
        <ul className="list-disc pl-6 text-green-300 text-sm space-y-2">
          <li>Transparent allocation of rewards</li>
          <li>Proportional to user engagement</li>
          <li>Decentralized verification</li>
        </ul>
      )
    },
    {
      icon: Zap,
      title: "Reward Calculation",
      content: (
        <pre className="text-green-300 text-xs bg-black/30 p-2 rounded">
          {`function calculateRWRD(activity) {
  const baseReward = 10;
  const multiplier = activity.engagement * 0.5;
  const timeBonus = activity.days * 0.1;
  
  return baseReward * (1 + multiplier + timeBonus);
}`}
        </pre>
      )
    },
    {
      icon: Calendar,
      title: "Claim Periods",
      content: (
        <div className="space-y-2 text-sm text-green-300">
          <p>• Daily rewards reset at 00:00 UTC</p>
          <p>• Weekly bonus for consistent claims</p>
          <p>• Monthly multiplier increases</p>
        </div>
      )
    },
    {
      icon: Star,
      title: "Reward Tiers",
      content: (
        <div className="space-y-2">
          {[
            { name: "Basic", range: "0-100 RWRD" },
            { name: "Silver", range: "101-500 RWRD" },
            { name: "Gold", range: "501-1000 RWRD" },
            { name: "Platinum", range: "1000+ RWRD" }
          ].map((tier) => (
            <div key={tier.name} className="flex justify-between text-sm">
              <span className="text-green-400">{tier.name}</span>
              <span className="text-green-300">{tier.range}</span>
            </div>
          ))}
        </div>
      )
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Rewards Mechanism"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {rewardsSections.map((section, index) => {
          const SectionIcon = section.icon;
          return (
            <Card key={index} className="space-y-3">
              <div className="flex items-center space-x-3">
                <SectionIcon className="text-green-400" size={24} />
                <h3 className="font-bold text-green-300">{section.title}</h3>
              </div>
              {section.content}
            </Card>
          );
        })}

        <p className="text-center text-xs text-green-500">
          {`// All rewards are verified on-chain for transparency`}
        </p>
      </div>
    </Modal>
  );
}