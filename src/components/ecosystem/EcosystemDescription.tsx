"use client";

// src/components/ecosystem/EcosystemDescription.tsx
import React, { useState } from 'react';
import { Rocket, Search, Book, Shield, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import RewardsMechanism from './RewardsMechanism';
import CryptoProject from './CryptoProject';
import LearningHub from './LearningHub';
import Empowerment from './Empowerment';
import type { EcosystemFeature } from '@/types/ecosystem.types';

const ecosystemFeatures: EcosystemFeature[] = [
  {
    icon: Rocket,
    title: 'Empowerment',
    description: 'Take control of your digital assets',
    command: '$ ./web3_empowerment',
    modalComponent: Empowerment
  },
  {
    icon: Search,
    title: 'Curated Projects',
    description: 'Discover verified opportunities',
    command: '$ list_crypto_projects',
    modalComponent: CryptoProject
  },
  {
    icon: Book,
    title: 'Educational Resources',
    description: 'Learn and earn',
    command: '$ open_learning_hub',
    modalComponent: LearningHub
  },
  {
    icon: Shield,
    title: 'Transparent Rewards',
    description: 'Clear reward mechanisms',
    command: '$ verify_rewards',
    modalComponent: RewardsMechanism
  }
];

export default function EcosystemDescription() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <Card className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2 text-green-200">
          {`// Brand Exit: Web3 Ecosystem Navigator`}
        </h2>
        <p className="text-green-300">
          {`> Discover, learn, and earn with confidence.`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ecosystemFeatures.map((feature) => {
          const FeatureIcon = feature.icon;
          const ModalComponent = feature.modalComponent;

          return (
            <div
              key={feature.title}
              className="bg-[#0a0a0a] border border-gray-800 rounded p-3 
                       text-center cursor-pointer hover:border-gray-600 
                       transition-all duration-300"
              onClick={() => setActiveModal(feature.title)}
            >
              <FeatureIcon className="mx-auto mb-2 text-purple-400" size={32} />
              <p className="text-xs text-gray-300">{feature.command}</p>
              <p className="text-sm text-gray-400 mt-1">{feature.title}</p>
              <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
            </div>
          );
        })}
      </div>

      {activeModal && 
        ecosystemFeatures.map((feature) => 
          feature.title === activeModal && feature.modalComponent && (
            <feature.modalComponent 
              key={feature.title}
              onClose={() => setActiveModal(null)} 
            />
          )
        )
      }

      <div className="text-center text-xs text-gray-500">
        {`// Empowering your Web3 journey with comprehensive tools and community-driven insights`}
      </div>
    </Card>
  );
}
