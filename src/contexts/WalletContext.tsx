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
          console.log('🔑 Tentative de génération de token pour le wallet:', walletAddress);
          
          // Vérifier si le wallet a des comptes
          if (!publicKey) {
            console.error('⚠️ ERREUR: Pas de clé publique disponible dans le wallet');
            return;
          }
          
          const storedAddress = authService.getWalletAddress();
          console.log('📝 Adresse stockée précédemment:', storedAddress);
          console.log('📝 Token expiré?', authService.isTokenExpired() ? 'Oui' : 'Non');
          
          // Vérifier si nous avons déjà un token valide pour cette adresse
          if (storedAddress !== walletAddress || authService.isTokenExpired()) {
            console.log('🔄 Génération d\'un nouveau token...');
            // Générer un nouveau token pour cette adresse
            const { token, expiresAt } = await authService.generateToken(walletAddress);
            authService.saveToken(token, expiresAt, walletAddress);
            console.log('✅ Nouveau token généré et enregistré');
            console.log('📝 Détails du token:', {
              tokenLength: token ? token.length : 0,
              expiresAt: expiresAt ? new Date(expiresAt).toLocaleString() : 'Non spécifié'
            });
          } else {
            console.log('✅ Utilisation du token existant valide');
            // Vérifier que le token est bien présent
            const currentToken = authService.getToken();
            if (!currentToken) {
              console.warn('⚠️ Token manquant malgré adresse valide, génération d\'un nouveau token...');
              const { token, expiresAt } = await authService.generateToken(walletAddress);
              authService.saveToken(token, expiresAt, walletAddress);
              console.log('✅ Nouveau token généré et enregistré');
            }
          }
        } catch (error: any) {
          console.error('❌ Erreur lors de la génération du token d\'authentification:', error);
          console.error('Détails de l\'erreur:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
        }
      } else {
        console.log('⚠️ Wallet non connecté ou clé publique non disponible');
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