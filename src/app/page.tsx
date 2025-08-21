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
import { authService } from '@/services/authService';

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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = () => {
      // Utiliser la nouvelle fonction d'état d'authentification
      const authState = authService.checkAuthenticationState();
      
      console.log('Vérification d\'authentification:', authState);
      
      // Si le token a expiré, l'utilisateur a déjà été déconnecté automatiquement
      if (authState.reason === 'token_expired') {
        console.log('Token expiré détecté, redirection vers /login');
        router.push('/login');
        return;
      }
      
      // Vérifier si l'utilisateur est authentifié
      const walletConnected = isConnected && isAuthReady;
      const isAuthenticated = authState.isAuthenticated || walletConnected;
      
      if (!isAuthenticated) {
        console.log('Utilisateur non authentifié, redirection vers /login');
        router.push('/login');
      } else {
        console.log('Utilisateur authentifié, accès autorisé');
        setShowLoginPrompt(false);
      }
    };

    // Délai pour s'assurer que le DOM est chargé
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [isConnected, isAuthReady, router]);
  
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
          ? 'text-white bg-gradient-to-r from-gray-600/70 to-gray-500/70 backdrop-blur-sm border border-gray-500/30 shadow-lg shadow-gray-500/10' 
          : 'text-gray-300 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-gray-700/30 hover:border-gray-500/30'
        }
      `}
    >
      <span className={activeSection === id ? 'text-gray-300' : 'text-gray-400'}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    // Si l'utilisateur n'est pas authentifié, afficher l'interface de connexion
    if (showLoginPrompt) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-black/40 backdrop-blur-md border border-gray-700/30 rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 flex items-center justify-center mx-auto">
                <img src="/logo-lastparadox.png" alt="Last Paradox" className="w-16 h-16" />
              </div>
              
              <div>
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent mb-2">
                  Last_Paradox △ mesh online
                </h2>
                <p className="text-gray-400">
                  Connect your wallet to access the ecosystem
                </p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-sm border border-blue-500/30 rounded-md text-white hover:from-blue-600/90 hover:to-purple-600/90 transition-all duration-200 font-medium"
                >
                  Connect Wallet & Login
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Contenu normal pour les utilisateurs authentifiés
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-gray-700/20 via-transparent to-transparent"></div>
      
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gray-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="p-6 border-b border-gray-800/50 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/logo-lastparadox.png" alt="Last Paradox" className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
                Last_Paradox △ mesh online
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {!showLoginPrompt && (
                <div className="flex items-center space-x-3">
                  {isConnected && (
                    <span className="text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">
                      {localStorage.getItem('isGoogleWallet') === 'true' ? 'Connected with Google' : 'Connected with Wallet'}
                    </span>
                  )}
                  {!isConnected && <WalletMultiButton />}
                </div>
              )}
              {showLoginPrompt && (
                <div className="text-sm text-gray-400">
                  Please connect below
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Navigation Header */}
            <header className="bg-black/40 backdrop-blur-md border border-gray-700/30 rounded-lg p-4 mb-6 shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex space-x-2">
                  {renderSectionButton('ecosystem', <Network size={18} />, 'Ecosystem')}
                  {renderSectionButton('vpn', <Shield size={18} />, 'VPN')}
                  {renderSectionButton('goals', <Target size={18} />, 'Goals')}
                </div>
              </div>
            </header>
            
            {/* Modal de sécurité supprimée pour éviter la demande de signature à chaque rafraîchissement */}
            {renderContent()}
          </div>
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
