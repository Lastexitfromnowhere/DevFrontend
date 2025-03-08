// src/contexts/WalletContext.tsx - Contexte de portefeuille Solana

'use client';

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
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
      // Déconnexion du service d'authentification
      authService.logout();
    }
  };

  // Générer automatiquement un token JWT lorsque le wallet est connecté
  useEffect(() => {
    const generateAuthToken = async () => {
      if (connected && publicKey) {
        const walletAddress = publicKey.toBase58();
        try {
          console.log('Generating token for wallet:', walletAddress);
          const storedAddress = authService.getWalletAddress();
          
          // Vérifier si nous avons déjà un token valide pour cette adresse
          if (storedAddress !== walletAddress || authService.isTokenExpired()) {
            // Générer un nouveau token pour cette adresse
            const { token, expiresAt } = await authService.generateToken(walletAddress);
            authService.saveToken(token, expiresAt, walletAddress);
            console.log('New token generated and saved');
          } else {
            console.log('Using existing valid token');
          }
        } catch (error) {
          console.error('Error generating authentication token:', error);
        }
      }
    };

    generateAuthToken();
  }, [connected, publicKey]);

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