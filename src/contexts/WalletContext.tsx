// src/contexts/WalletContext.tsx - Contexte de portefeuille Solana

'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { 
  WalletProvider, 
  useWallet 
} from '@solana/wallet-adapter-react';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter 
} from '@solana/wallet-adapter-wallets';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import { authService } from '@/services/authService';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';

// Déterminer le réseau en fonction de l'environnement
const getNetwork = () => {
  if (process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet') {
    return 'mainnet-beta';
  }
  return 'devnet';
};

// Interface du contexte de portefeuille
interface WalletContextType {
  isConnected: boolean;
  isAuthReady: boolean;
  account: string | null;
  publicKey: string | null;
  chain: string;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

// Création du contexte
const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  isAuthReady: false,
  account: null,
  publicKey: null,
  chain: 'Solana',
  connectWallet: () => {},
  disconnectWallet: () => {}
});

// Composant Provider principal
export const WalletContextProvider = ({ children }: { children: ReactNode }) => {
  // Configuration des adaptateurs de portefeuille
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter()
  ], []);

  const endpoint = useMemo(() => clusterApiUrl(getNetwork()), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect
      >
        <WalletContextWrapper>
          {children}
        </WalletContextWrapper>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Wrapper pour fournir le contexte personnalisé
const WalletContextWrapper = ({ children }: { children: ReactNode }) => {
  const { 
    publicKey, 
    connected, 
    disconnect 
  } = useWallet();

  const [isAuthReady, setIsAuthReady] = useState(false);

  // Méthode pour connecter le portefeuille
  const connectWallet = () => {
    // Le WalletMultiButton gère la connexion
  };

  // Méthode pour déconnecter le portefeuille
  const disconnectWallet = () => {
    if (disconnect) {
      disconnect();
      // Déconnexion du service d'authentification
      authService.logout();
    }
  };

  // Authentification simplifiée sans demande de signature à chaque rafraîchissement
  useEffect(() => {
    const handleAuthentication = async () => {
      if (connected && publicKey) {
        const walletAddress = publicKey.toBase58();
        try {
          // Vérifier si le token existe déjà et est valide
          const storedAddress = authService.getWalletAddress();
          
          if (storedAddress !== walletAddress || authService.isTokenExpired()) {
            // Générer un nouveau token sans demander de signature
            const { token, expiresAt } = await authService.generateToken(walletAddress);
            
            if (token && expiresAt) {
              authService.saveToken(token, expiresAt, walletAddress);
              setIsAuthReady(true);
            } else {
              console.warn('Impossible de générer un token, mais on continue quand même');
              setIsAuthReady(true); // On continue quand même
            }
          } else {
            // Token existant et valide trouvé
            setIsAuthReady(true);
          }
        } catch (error) {
          console.error('Erreur lors de l\'authentification:', error);
          // On définit quand même isAuthReady à true pour éviter le blocage
          setIsAuthReady(true);
        }
      } else {
        // Même si non connecté, on considère que l'authentification est prête
        setIsAuthReady(true);
      }
    };
    
    handleAuthentication();
  }, [connected, publicKey]);

  // Valeur du contexte
  const contextValue = {
    isConnected: connected,
    isAuthReady,
    account: publicKey ? publicKey.toBase58() : null,
    publicKey: publicKey ? publicKey.toBase58() : null,
    chain: 'Solana',
    connectWallet,
    disconnectWallet
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte du portefeuille
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
};