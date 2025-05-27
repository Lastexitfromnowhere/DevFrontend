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
import { googleWalletService } from '@/services/googleWalletService';
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
  isGoogleWallet: boolean;
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
  isGoogleWallet: false,
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
  
  // Pour la redirection après déconnexion
  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter() : null;

  // Méthode pour connecter le portefeuille
  const connectWallet = () => {
    // Simuler un clic sur le WalletMultiButton pour ouvrir le sélecteur de portefeuille
    if (typeof window !== 'undefined') {
      const walletButtons = document.getElementsByClassName('wallet-adapter-button');
      
      if (walletButtons && walletButtons.length > 0) {
        // Simuler un clic sur le premier bouton de portefeuille trouvé
        (walletButtons[0] as HTMLElement).click();
      } else {
        console.warn('Aucun bouton de portefeuille trouvé dans le DOM');
      }
    }
  };

  // Méthode pour déconnecter le portefeuille
  const disconnectWallet = () => {
    // Vérifier si l'utilisateur est connecté via Google
    const isGoogleWallet = typeof window !== 'undefined' ? localStorage.getItem('isGoogleWallet') === 'true' : false;
    
    if (isGoogleWallet) {
      // Déconnexion pour les utilisateurs Google
      console.log('Déconnexion d\'un utilisateur Google');
      
      // Supprimer les données de session Google
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isGoogleWallet');
        localStorage.removeItem('google_user_id');
        // Supprimer également les données d'authentification standard
        authService.logout();
        setIsAuthReady(false);
        
        // Créer et dispatcher un événement personnalisé
        const disconnectEvent = new Event('wallet-disconnect');
        window.dispatchEvent(disconnectEvent);
        
        // Rediriger vers la page de login
        if (router) {
          router.push('/login');
        } else {
          window.location.href = '/login';
        }
      }
    } else if (disconnect) {
      // Déconnexion standard pour les utilisateurs de portefeuille Solana
      disconnect();
      // Déconnexion du service d'authentification
      authService.logout();
      setIsAuthReady(false);
      
      // Émettre un événement personnalisé pour informer l'application de la déconnexion
      if (typeof window !== 'undefined') {
        // Créer et dispatcher un événement personnalisé
        const disconnectEvent = new Event('wallet-disconnect');
        window.dispatchEvent(disconnectEvent);
        
        // Rediriger vers la page de login
        if (router) {
          router.push('/login');
        } else {
          window.location.href = '/login';
        }
      }
    }
  };

  // Authentification simplifiée sans demande de signature à chaque rafraîchissement
  useEffect(() => {
    const handleAuthentication = async () => {
      // Si l'utilisateur n'est pas connecté, on réinitialise l'état d'authentification
      if (!connected || !publicKey) {
        setIsAuthReady(false);
        return;
      }
      
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
            console.log('Authentification réussie avec un nouveau token');
            
            // Rediriger vers la page d'accueil après authentification réussie
            if (typeof window !== 'undefined') {
              // Ajouter un délai pour permettre la mise à jour de l'état
              setTimeout(() => {
                window.location.href = '/';
              }, 500);
            }
          } else {
            console.warn('Impossible de générer un token, mais on continue quand même');
            setIsAuthReady(true); // On continue quand même
          }
        } else {
          // Token existant et valide trouvé
          console.log('Token existant valide trouvé');
          setIsAuthReady(true);
          
          // Rediriger vers la page d'accueil si nous sommes sur la page de login
          if (typeof window !== 'undefined' && window.location.pathname.includes('/login')) {
            // Ajouter un délai pour permettre la mise à jour de l'état
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'authentification:', error);
        // On définit quand même isAuthReady à true pour éviter le blocage
        setIsAuthReady(true);
      }
    };
    
    handleAuthentication();
  }, [connected, publicKey]);

  // Vérifier si l'utilisateur est connecté via Google
  const isGoogleWallet = typeof window !== 'undefined' ? localStorage.getItem('isGoogleWallet') === 'true' : false;
  
  // Récupérer l'adresse du portefeuille Google si nécessaire
  const getGoogleWalletPublicKey = () => {
    if (isGoogleWallet && typeof window !== 'undefined') {
      // Récupérer l'adresse du portefeuille depuis le localStorage
      return localStorage.getItem('wallet_address');
    }
    return null;
  };
  
  // Valeur du contexte
  const contextValue = {
    isConnected: connected || isGoogleWallet,
    isAuthReady,
    account: publicKey ? publicKey.toBase58() : (isGoogleWallet ? getGoogleWalletPublicKey() : null),
    publicKey: publicKey ? publicKey.toBase58() : (isGoogleWallet ? getGoogleWalletPublicKey() : null),
    chain: 'Solana',
    isGoogleWallet,
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