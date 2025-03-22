"use client";

// src/app/page.tsx
// Trigger deployment - 2025-03-22
import React, { useState } from 'react';
import { Terminal, Shield, Target, Network } from 'lucide-react';
import { useWalletContext } from '@/contexts/WalletContext';

// Components Imports
import WalletDisclaimer from '@/components/wallet/WalletDisclaimer';
import WalletStatus from '@/components/wallet/WalletStatus';
import EcosystemDescription from '@/components/ecosystem/EcosystemDescription';
import ProjectsGrid from '@/components/ecosystem/ProjectsGrid';
import VPNRewards from '@/components/vpn/VPNRewards';
import NetworkStats from '@/components/vpn/NetworkStats';
import NodeStatusSummary from '@/components/vpn/NodeStatusSummary';
import SiteGoals from '@/components/goals/SiteGoals';
import { DailyRewards } from '@/components/rewards/DailyRewards';
import RSSFeed from '@/components/RSSFeed';
import DHTStatus from '@/components/dht/DHTStatus';
import DHTNodes from '@/components/dht/DHTNodes';
import DHTWireGuardNodes from '@/components/dht/DHTWireGuardNodes';
import RewardsMechanism from '@/components/ecosystem/RewardsMechanism';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('ecosystem');
  const { isConnected } = useWalletContext();

  const renderSectionButton = (id: string, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-md
        transition-all duration-200 ease-in-out
        ${activeSection === id 
          ? 'text-white bg-gradient-to-r from-blue-600/70 to-purple-600/70 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/10' 
          : 'text-gray-300 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-gray-700/30 hover:border-blue-500/30'
        }
      `}
    >
      <span className={activeSection === id ? 'text-blue-300' : 'text-gray-400'}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'vpn':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DHTStatus />
              </div>
              <div>
                <VPNRewards earnings={0} />
              </div>
              

              
            </div>
            
            {/* Section DHT */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Network size={20} className="mr-2" />
                Réseau DHT
              </h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Nœuds DHT</h3>
                <DHTNodes />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Nœuds WireGuard</h3>
                <DHTWireGuardNodes />
              </div>
            </div>
          </div>
        );

      case 'goals':
        return <SiteGoals />;

      case 'ecosystem':
      default:
        return (
          <div className="space-y-6">
            <EcosystemDescription />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Content - 3 colonnes */}
              <div className="lg:col-span-3 space-y-6">
                <ProjectsGrid />
                <RSSFeed />
              </div>
              
              {/* Sidebar - 1 colonne */}
              <div className="space-y-6">
                <WalletStatus />
                {isConnected && <DailyRewards />}
                {isConnected && <NodeStatusSummary />}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <header className="bg-black/40 backdrop-blur-md border border-gray-700/30 rounded-lg p-4 mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col items-start">
              <div className="flex items-center space-x-2 mb-2">
                <Terminal size={24} className="text-blue-400" />
                <h1 className="text-xl font-bold text-white">Brand Exit Dashboard</h1>
              </div>
            </div>
            
            <nav className="flex space-x-4">
              {renderSectionButton('ecosystem', <Terminal size={20} />, 'Ecosystem')}
              {renderSectionButton('vpn', <Shield size={20} />, 'VPN Node')}
              {renderSectionButton('goals', <Target size={20} />, 'Site Goals')}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          {!isConnected && (
            <WalletDisclaimer onDismiss={() => {}} />
          )}
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-300 py-4 border-t border-gray-700/30 bg-black/20 backdrop-blur-sm rounded-lg">
          {`> brand-exit@2025 ~ Building the decentralized future`}
        </footer>
      </div>
    </div>
  );
}
