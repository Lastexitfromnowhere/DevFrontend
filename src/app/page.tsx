"use client";

// src/app/page.tsx
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

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('ecosystem');
  const { isConnected } = useWalletContext();

  const renderSectionButton = (id: string, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded
        transition-colors duration-200
        ${activeSection === id 
          ? 'text-white bg-gray-700/80' 
          : 'text-gray-400 hover:text-white'
        }
      `}
    >
      {icon}
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
    <div className="min-h-screen bg-black text-purple p-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <header className="bg-[#111] border border-purple-800 rounded-lg p-4 mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Terminal size={24} className="text-white" />
              <h1 className="text-xl font-bold">Brand Exit Dashboard</h1>
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
        <footer className="mt-8 text-center text-sm text-purple-400 py-4 border-t border-purple-700">
          {`> brand-exit@2025 ~ Building the decentralized future`}
        </footer>
      </div>
    </div>
  );
}
