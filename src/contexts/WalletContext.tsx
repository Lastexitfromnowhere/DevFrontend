// src/contexts/WalletContext.tsx - Contexte de portefeuille Solana

'use client';

import React, { createContext, useContext, useMemo, ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../services/authService';
import { 
  ConnectionProvider, 
  WalletProvider, 
  useWallet 
} from '@solana/wallet-adapter-react';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter 
} from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Imports par défaut requis
import { clusterApiUrl } from '@solana/web3.js';

// Fonction pour obtenir le réseau
const getNetwork = (): WalletAdapterNetwork => {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'development' 
    ? WalletAdapterNetwork.Devnet 
    : WalletAdapterNetwork.Mainnet;
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
  // Ne pas créer de providers ici car ils sont déjà dans providers.tsx
  return (
    <WalletContextWrapper>
      {children}
    </WalletContextWrapper>
  );
};

// Wrapper pour fournir le contexte personnalisé
const WalletContextWrapper = ({ children }: { children: ReactNode }) => {
  const { 
    publicKey, 
    connected, 
    disconnect,
    select,
    connect,
    wallets
  } = useWallet();

  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Pour la redirection après déconnexion
  const router = useRouter();

  // Méthode pour connecter le portefeuille - Version directe
  const connectWallet = async () => {
    console.log('Tentative de connexion wallet...');
    
    try {
      // Utiliser directement le hook useWallet pour la connexion
      if (select && wallets.length > 0) {
        console.log('Sélection du premier wallet disponible...');
        const firstWallet = wallets[0];
        select(firstWallet.adapter.name);
        
        // Attendre un peu pour que la sélection se fasse
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (connect) {
          console.log('Connexion au wallet sélectionné...');
          await connect();
          return;
        }
      }
      
      // Fallback: connexion directe aux wallets
      console.log('Fallback: tentative de connexion directe...');
      
      // Essayer Phantom en premier
      if (window.solana?.isPhantom) {
        console.log('Phantom détecté, connexion directe...');
        const response = await window.solana.connect();
        console.log('Phantom connecté:', response.publicKey.toString());
        return;
      }
      
      // Essayer Solflare
      if ((window as any).solflare?.isSolflare) {
        console.log('Solflare détecté, connexion directe...');
        const response = await (window as any).solflare.connect();
        console.log('Solflare connecté:', response.publicKey.toString());
        return;
      }
      
      console.log('Aucun wallet détecté');
      throw new Error('Aucun wallet compatible trouvé');
      
    } catch (error) {
      console.error('Erreur lors de la connexion wallet:', error);
      throw error;
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
            
            // Ne pas rediriger automatiquement, laisser la page se mettre à jour
            console.log('Token généré, état mis à jour');
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
      // Essayer de récupérer l'adresse du portefeuille depuis différentes sources dans le localStorage
      const possibleKeys = ['wallet_address', 'WALLET_ADDRESS_KEY', 'walletAddress'];
      
      for (const key of possibleKeys) {
        const address = localStorage.getItem(key);
        if (address) {
          console.log(`Adresse de portefeuille Google trouvée avec la clé ${key}:`, address);
          return address;
        }
      }
      
      // Si aucune adresse n'est trouvée, générer une valeur par défaut pour permettre l'affichage
      console.log('Aucune adresse de portefeuille Google trouvée, utilisation d\'une valeur par défaut');
      return 'google-wallet';
    }
    return null;
  };
  
  // Effet pour s'assurer que isAuthReady est correctement défini pour les utilisateurs Google
  useEffect(() => {
    if (isGoogleWallet && !isAuthReady) {
      console.log('Utilisateur Google détecté, définition de isAuthReady à true');
      setIsAuthReady(true);
    }
  }, [isGoogleWallet, isAuthReady]);

  // Valeur du contexte
  const contextValue = {
    isConnected: connected || isGoogleWallet,
    isAuthReady: isAuthReady || isGoogleWallet, // Forcer isAuthReady à true pour les utilisateurs Google
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