// src/components/ecosystem/RewardsMechanism.tsx
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Shield, Zap, Calendar, Star } from 'lucide-react';
import { DashboardBadge } from '@/components/ui/DashboardBadge';

export default function RewardsMechanism({ onClose }: { onClose: () => void }) {
  const rewardsSections = [
    {
      icon: Shield,
      title: "Distribution Principles",
      content: (
        <ul className="list-disc pl-6 text-gray-300 text-sm space-y-2">
          <li>Transparent reward attribution</li>
          <li>Proportional to user engagement</li>
          <li>Decentralized verification</li>
        </ul>
      )
    },
    {
      icon: Zap,
      title: "Reward Calculation",
      content: (
        <pre className="text-blue-400 text-xs bg-black/30 backdrop-blur-sm p-3 rounded-md border border-gray-700/30 font-mono">
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
        <div className="space-y-2 text-sm text-gray-300 bg-black/20 backdrop-blur-sm p-3 rounded-md">
          <p>• Daily rewards reset at 00:00 UTC</p>
          <p>• Weekly bonus for regular claims</p>
          <p>• Monthly multiplier increase</p>
        </div>
      )
    },
    {
      icon: Star,
      title: "Reward Levels",
      content: (
        <div className="space-y-2 bg-black/20 backdrop-blur-sm p-3 rounded-md">
          {[
            { name: "Basic", range: "0-100 RWRD", color: "info" },
            { name: "Silver", range: "101-500 RWRD", color: "default" },
            { name: "Gold", range: "501-1000 RWRD", color: "warning" },
            { name: "Platinum", range: "1000+ RWRD", color: "success" }
          ].map((tier) => (
            <div key={tier.name} className="flex justify-between text-sm items-center">
              <DashboardBadge variant={tier.color as any} size="sm">
                {tier.name}
              </DashboardBadge>
              <span className="text-white">{tier.range}</span>
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
      title="Last Paradox Rewards"
      className="max-w-2xl backdrop-blur-md bg-black/40 border border-gray-700/50 shadow-lg transition-all duration-500 animate-pulse-shadow"
    >
      <div className="space-y-6 animate-fade-in-down">
        {rewardsSections.map((section, index) => {
          const SectionIcon = section.icon;
          return (
            <Card key={index} className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-4 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-black/50 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
                  <SectionIcon className="text-blue-400" size={20} />
                </div>
                <h3 className="font-semibold text-white">{section.title}</h3>
              </div>
              {section.content}
            </Card>
          );
        })}

        <div className="text-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
          {`// Freedom • Security • Anonymity`}
        </div>
      </div>
    </Modal>
  );
}