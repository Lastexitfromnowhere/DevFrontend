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
import DHTNodes from '@/components/dht/DHTNodes';
import RewardsMechanism from '@/components/ecosystem/RewardsMechanism';
import DiscordLink from '@/components/discord/DiscordLink';
import HeaderDiscordButton from '@/components/discord/HeaderDiscordButton';
import { TruffleMint } from '@/components/TruffleMint';

const IPFS_CID = 'QmeZqms4zJXz91uNetmEKmxeG2fBQezGKz4egon5kiiai2';

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
                <NodeStatusSummary />
              </div>
              <div>
                <VPNRewards />
              </div>
            </div>
            
            {/* Section DHT Unifiée */}
            <div className="mt-8">
              <DHTNodes />
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
            <TruffleMint />
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
                {isConnected && <DiscordLink />}
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
                <h1 className="text-xl font-bold text-white">Dashboard</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <HeaderDiscordButton />
              
              <nav className="flex space-x-4">
              {renderSectionButton('ecosystem', <Terminal size={20} />, 'Ecosystem')}
              {renderSectionButton('vpn', <Shield size={20} />, 'VPN Node')}
              {renderSectionButton('goals', <Target size={20} />, 'Site Goals')}
            </nav>
            </div>
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
        <footer className="mt-8 text-gray-300 py-6 border-t border-gray-700/30 bg-black/20 backdrop-blur-sm rounded-lg">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Company */}
              <div>
                <h3 className="text-blue-400 font-semibold mb-4">Brand Exit</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="/about" className="text-gray-400 hover:text-blue-400 transition-colors">About Us</a>
                  </li>
                  <li>
                    <a href="/contact" className="text-gray-400 hover:text-blue-400 transition-colors">Contact</a>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-blue-400 font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="/faq" className="text-gray-400 hover:text-blue-400 transition-colors">FAQ</a>
                  </li>
                  <li>
                    <a href="/run-node" className="text-gray-400 hover:text-blue-400 transition-colors">Run a Node</a>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="text-blue-400 font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">Terms of Service</a>
                  </li>
                  <li>
                    <a href="/privacy-policy" className="text-gray-400 hover:text-blue-400 transition-colors">Privacy Policy</a>
                  </li>
                </ul>
              </div>

              {/* Social */}
              <div>
                <h3 className="text-blue-400 font-semibold mb-4">Connect</h3>
                <div className="flex space-x-4">
                  <a
                    href="https://github.com/your-repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Terminal size={20} />
                  </a>
                  <a
                    href="https://discord.gg/bEvphRKq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Network size={20} />
                  </a>
                </div>
              </div>
            </div>

            <div className="text-center text-sm border-t border-gray-700/30 pt-8">
              {`> brand-exit@2025 ~ Building the decentralized future`}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
