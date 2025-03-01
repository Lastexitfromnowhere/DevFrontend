"use client";

// src/components/goals/SiteGoals.tsx
import React from 'react';
import { Card } from '@/components/ui/Card';
import { Target, Users, Rocket, Shield, Award } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';

const milestones = [
  {
    icon: Shield,
    title: "Decentralize VPN Network",
    description: "Build a robust network of decentralized VPN nodes operated by the community",
    progress: 65,
    total: "1,200 Nodes",
    current: "780 Nodes"
  },
  {
    icon: Users,
    title: "Community Growth",
    description: "Expand our ecosystem with active participants and node operators",
    progress: 45,
    total: "10,000 Users",
    current: "4,500 Users"
  },
  {
    icon: Rocket,
    title: "Launch Brand Exit Token",
    description: "Launch RWRD token with utility and governance rights",
    progress: 80,
    total: "Q1 2025",
    current: "Development"
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
      <Card>
        <div className="flex items-center space-x-2 mb-6">
          <Target className="text-green-400" size={24} />
          <h2 className="text-xl font-bold text-green-300">Project Roadmap</h2>
        </div>

        <div className="space-y-8">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-start space-x-3">
                  <Icon className="text-green-400 mt-1" size={20} />
                  <div className="flex-1">
                    <h3 className="font-bold text-green-300">{milestone.title}</h3>
                    <p className="text-sm text-green-400 mb-2">{milestone.description}</p>
                    <ProgressBar progress={milestone.progress} />
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-green-500">Progress: {milestone.current}</span>
                      <span className="text-green-400">Goal: {milestone.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center space-x-2 mb-6">
          <Award className="text-green-400" size={24} />
          <h2 className="text-xl font-bold text-green-300">Community Milestones</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {communityStats.map((stat, index) => (
            <div key={index} className="text-center p-4 bg-black/20 rounded">
              <p className="text-2xl font-bold text-green-300">{stat.value}</p>
              <p className="text-sm text-green-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}