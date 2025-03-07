// src/contexts/WalletContext.tsx - Contexte de portefeuille Solana

'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
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

// Interface du contexte de portefeuille
interface WalletContextType {
  isConnected: boolean;
  account: string | null;
  publicKey: string | null;
  chain: string;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

// Création du contexte
const WalletContext = createContext<WalletContextType>({
  isConnected: false,
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

  return (
    <WalletProvider 
      wallets={wallets} 
      autoConnect
    >
      <WalletContextWrapper>
        {children}
      </WalletContextWrapper>
    </WalletProvider>
  );
};

// Wrapper pour fournir le contexte personnalisé
const WalletContextWrapper = ({ children }: { children: ReactNode }) => {
  const { 
    publicKey, 
    connected, 
    disconnect 
  } = useWallet();

  // Méthode pour connecter le portefeuille
  const connectWallet = () => {
    // Le WalletMultiButton gère la connexion
  };

  // Méthode pour déconnecter le portefeuille
  const disconnectWallet = () => {
    if (disconnect) {
      disconnect();
    }
  };

  // Valeur du contexte
  const contextValue = {
    isConnected: connected,
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