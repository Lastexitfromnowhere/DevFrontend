"use client";

// src/app/page.tsx
// Trigger deployment - 2025-03-22
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, Target, Network, Loader2, RefreshCw, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
// Assure-toi que lucide-react est bien installé : npm install lucide-react
// Si tu utilises TypeScript, installe aussi les types : npm install --save-dev @types/react
import { useWalletContext } from '@/contexts/WalletContext';

// Components Imports
import WalletDisclaimer from '@/components/wallet/WalletDisclaimer';
import WalletStatus from '@/components/wallet/WalletStatus';
import EcosystemDescription from '@/components/ecosystem/EcosystemDescription';
import ProjectsGrid from '@/components/ecosystem/ProjectsGrid';
import VPNRewards from '@/components/vpn/VPNRewards';
import DesktopAppPromo from '@/components/DesktopAppPromo';
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
  const { isConnected, isAuthReady, connectWallet } = useWalletContext();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const router = useRouter();
  
  // Rediriger vers la page de login si l'utilisateur n'est pas connecté
  // Utiliser useEffect avec un drapeau pour éviter les redirections multiples
  useEffect(() => {
    // Vérifier si nous sommes déjà en train de rediriger
    const isRedirecting = sessionStorage.getItem('isRedirecting');
    if (isRedirecting === 'true') return;
    
    // Vérifier si l'utilisateur est connecté via wallet ou via Google
    const isLoggedIn = isConnected || localStorage.getItem('jwt_token');
    
    if (!isLoggedIn) {
      console.log('Utilisateur non connecté, redirection vers /login');
      sessionStorage.setItem('isRedirecting', 'true');
      router.push('/login');
    } else {
      console.log('Utilisateur connecté, affichage du dashboard');
      // S'assurer que les états de connexion sont synchronisés
      if (!isConnected && localStorage.getItem('jwt_token')) {
        localStorage.setItem('isConnected', 'true');
        localStorage.setItem('isAuthReady', 'true');
      }
      // Réinitialiser le drapeau de redirection
      sessionStorage.removeItem('isRedirecting');
    }
  }, [isConnected, router]);
  
  // Effet pour gérer la déconnexion manuelle
  useEffect(() => {
    const handleDisconnect = () => {
      console.log('Déconnexion détectée, redirection vers /login');
      router.push('/login');
    };
    
    // Écouter l'événement de déconnexion
    window.addEventListener('wallet-disconnect', handleDisconnect);
    
    return () => {
      window.removeEventListener('wallet-disconnect', handleDisconnect);
    };
  }, [router]);

  // Masquer le disclaimer dès que le wallet est connecté, le réafficher à la déconnexion
  React.useEffect(() => {
    // Vérifier si l'utilisateur est connecté via wallet ou via Google
    const isLoggedIn = isConnected || localStorage.getItem('jwt_token');
    
    if (isLoggedIn) {
      setShowDisclaimer(false);
    } else {
      setShowDisclaimer(true);
    }
  }, [isConnected]);

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
        return <DesktopAppPromo />;

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
                {isConnected && isAuthReady && <DailyRewards />}
                {isConnected && isAuthReady && <DiscordLink />}
  
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <header className="bg-black/40 backdrop-blur-md border border-gray-700/30 rounded-lg p-4 mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">

            <div className="flex items-center space-x-4">
              <HeaderDiscordButton />
              
              <nav className="flex space-x-4">
              {renderSectionButton('ecosystem', <Terminal size={20} />, 'Ecosystem')}
              {renderSectionButton('vpn', <Shield size={20} />, 'Desktop App')}
              {renderSectionButton('goals', <Target size={20} />, 'Site Goals')}
            </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          {/* Modal de sécurité supprimée pour éviter la demande de signature à chaque rafraîchissement */}
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
