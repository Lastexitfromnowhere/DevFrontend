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

  // Générer automatiquement un token JWT lorsque le wallet est connecté
  useEffect(() => {
    const generateAuthToken = async () => {
      setIsAuthReady(false);
      if (connected && publicKey && window?.solana) {
        const walletAddress = publicKey.toBase58();
        try {
          // Étape 1 : demander à l'utilisateur de signer un message
          const message = `Sign this message to authenticate: ${Date.now()}`;
          const encodedMessage = new TextEncoder().encode(message);
          let signature;
          try {
            signature = await window.solana.signMessage(encodedMessage, 'utf8');
           // Si la signature est un objet (Phantom), récupérer le buffer
           if (signature && signature.signature) {
             signature = signature.signature;
           }
          } catch (signError) {
            console.error('❌ Signature refusée ou erreur lors de la signature :', signError);
            setIsAuthReady(false);
            return;
          }
           if (!signature) {
             console.error('❌ Signature manquante. Authentification annulée.');
             setIsAuthReady(false);
             disconnectWallet();
             return;
           }
          // Étape 2 : vérifier si le token existe déjà et est valide
          const storedAddress = authService.getWalletAddress();
          if (storedAddress !== walletAddress || authService.isTokenExpired()) {
            // Générer un nouveau token côté backend (ou local) avec la signature
            // TODO: Passer la signature et le message si l'API backend évolue
            const { token, expiresAt } = await authService.generateToken(walletAddress);
           if (token && expiresAt) {
             authService.saveToken(token, expiresAt, walletAddress);
             setIsAuthReady(true);
           } else {
             setIsAuthReady(false);
             disconnectWallet();
           }
          } else {
            // Token existant et valide trouvé
            setIsAuthReady(true);
          }
        } catch (error) {
          console.error('❌ Erreur lors de l\'authentification par signature :', error);
          setIsAuthReady(false);
        }
      } else {
        setIsAuthReady(false);
      }
    };
    generateAuthToken();
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