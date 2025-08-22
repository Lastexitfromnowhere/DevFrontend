"use client";
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
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow space-y-6"
      style={{
        backgroundImage: `url(https:
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundBlendMode: 'overlay'
      }}
    >
    <div 
      className="text-center bg-black/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700/30"
    >
      <h2 className="text-xl font-semibold mb-2 text-white">
        {`
      </h2>
      <p className="text-gray-300">
        {`> Discover, learn and earn with confidence.`}
      </p>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {ecosystemFeatures.map((feature) => {
        const FeatureIcon = feature.icon;
        const ModalComponent = feature.modalComponent;
        return (
          <div
            key={feature.title}
            className="backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg p-4
                      text-center cursor-pointer hover:bg-black/50 hover:border-gray-600
                      transition-all duration-300"
            onClick={() => setActiveModal(feature.title)}
          >
            <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm mx-auto mb-3 w-fit">
              <FeatureIcon className="text-blue-400" size={24} />
            </div>
            <p className="text-xs text-blue-400 font-mono bg-blue-500/10 backdrop-blur-sm p-1 rounded mb-2">{feature.command}</p>
            <p className="text-sm text-white font-medium">{feature.title}</p>
            <p className="text-xs text-gray-400 mt-1">{feature.description}</p>
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
    <div className="text-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
      {`
    </div>
  </Card>
  );
}
