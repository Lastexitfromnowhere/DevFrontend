// src/app/page.tsx
import React, { useState } from 'react';
import { Terminal, Shield, Target } from 'lucide-react';
import { useWalletContext } from '@/contexts/WalletContext';
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
import { Button } from '@/components/ui/Button';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('ecosystem');
  const { isConnected } = useWalletContext();

  const renderSectionButton = (id: string, icon: React.ReactNode, label: string) => (
    <Button
      onClick={() => setActiveSection(id)}
      variant={activeSection === id ? 'primary' : 'ghost'}
      size="md"
      icon={icon}
    >
      {label}
    </Button>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'ecosystem':
        return (
          <div className="space-y-6">
            <EcosystemDescription />
            <ProjectsGrid />
            <RSSFeed />
          </div>
        );
      case 'vpn':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WalletStatus />
              <VPNRewards />
            </div>
            <NetworkStats />
            <NodeStatusSummary />
            <DHTStatus />
            <DHTNodes />
            <DHTWireGuardNodes />
          </div>
        );
      case 'goals':
        return (
          <div className="space-y-6">
            <SiteGoals />
            <DailyRewards />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <header className="bg-[#111] border border-gray-800 rounded-lg p-4 mb-6 shadow-lg">
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
        <footer className="mt-8 text-center text-sm text-gray-400 py-4 border-t border-gray-700">
          {`> brand-exit@2025 ~ Building the decentralized future`}
        </footer>
      </div>
    </div>
  );
}
