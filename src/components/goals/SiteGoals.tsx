"use client";
import React from 'react';
import { Card } from '@/components/ui/Card';
import { Target, Users, Rocket, Shield, Award } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DashboardBadge } from '@/components/ui/DashboardBadge';
const milestones = [
  {
    icon: Shield,
    title: "Decentralized VPN Network",
    description: "Build a robust network of decentralized VPN nodes operated by the community",
    progress: 65,
    total: "1,200 Nodes",
    current: "780 Nodes"
  },
  {
    icon: Users,
    title: "Community Growth",
    description: "Expand our ecosystem with active participants and node operators",
    progress: 5,
    total: "10,000 Users",
    current: "1,000 Users"
  },
  {
    icon: Rocket,
    title: "Last Paradox Token",
    description: "Launch community token with utility and governance rights",
    progress: 5,
    total: "Q2 2025",
    current: "Planning"
  },
  {
    icon: Award,
    title: "NFT Private Sale",
    description: "Exclusive NFT collection for early supporters with special benefits",
    progress: 0,
    total: "Q3 2025",
    current: "Not Started"
  }
];
const communityStats = [
  { label: "Active Nodes", value: "1.2K" },
  { label: "Total RWRD", value: "45K" },
  { label: "Community Members", value: "8.5K" },
  { label: "Projects Listed", value: "12" }
];
export default function SiteGoals() {
  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
            <Target className="text-blue-400" size={20} />
          </div>
          <h2 className="text-xl font-semibold text-white">Project Roadmap</h2>
        </div>
        <div className="space-y-8">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon;
            return (
              <div key={index} className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-4 transition-all duration-300 hover:bg-black/40">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
                    <Icon className="text-blue-400" size={18} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{milestone.title}</h3>
                    <p className="text-sm text-gray-300 mb-3">{milestone.description}</p>
                    <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-white to-gray-400"
                        style={{ width: `${Math.min(Math.max(milestone.progress, 0), 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-400">Progress: <span className="text-blue-400">{milestone.current}</span></span>
                      <span className="text-gray-400">Goal: <span className="text-white">{milestone.total}</span></span>
                    </div>
                    <div className="mt-3">
                      <DashboardBadge 
                        variant={milestone.progress >= 75 ? "success" : milestone.progress >= 40 ? "warning" : "info"}
                      >
                        {milestone.progress >= 75 ? "Almost Complete" : milestone.progress >= 40 ? "In Progress" : "Just Started"}
                      </DashboardBadge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-full bg-yellow-500/20 backdrop-blur-sm">
            <Award className="text-yellow-400" size={20} />
          </div>
          <h2 className="text-xl font-semibold text-white">Community Milestones</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {communityStats.map((stat, index) => (
            <div key={index} className="text-center p-4 backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg transition-all duration-300 hover:bg-black/40">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-blue-400">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
          {`
        </div>
      </Card>
    </div>
  );
}
