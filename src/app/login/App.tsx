import React, { useEffect } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Button, Box, Typography, CircularProgress, Link } from '@mui/material';
import { AccountBalanceWallet } from '@mui/icons-material';
import { useWalletContext } from '@/contexts/WalletContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { authService } from '@/services/authService';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { googleWalletService } from '@/services/googleWalletService';

// Constantes pour le stockage local (doivent correspondre à celles de authService.js)
const WALLET_ADDRESS_KEY = 'wallet_address';
const GOOGLE_USER_ID_KEY = 'google_user_id';

function App() {
  const [loading, setLoading] = React.useState(false);
  const { connectWallet, isConnected, isAuthReady } = useWalletContext();
  const router = useRouter();

  // Effet pour créer les particules animées
  useEffect(() => {
    const createParticles = () => {
      const container = document.getElementById('particles-container');
      if (!container) return;
      
      // Nettoyer les particules existantes
      container.innerHTML = '';
      
      // Créer de nouvelles particules
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        container.appendChild(particle);
      }
    };
    
    createParticles();
    
    // Recréer les particules lors du redimensionnement
    window.addEventListener('resize', createParticles);
    
    return () => {
      window.removeEventListener('resize', createParticles);
    };
  }, []);

  // Rediriger vers la page d'accueil si déjà connecté
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Utiliser la nouvelle fonction d'état d'authentification
      const authState = authService.checkAuthenticationState();
      const walletConnected = isConnected && isAuthReady;
      
      console.log('Vérification d\'authentification sur /login:', authState);
      
      // Si le token a expiré mais qu'on peut le régénérer (utilisateur Google)
      if (authState.canRegenerateToken) {
        console.log('Token expiré pour utilisateur Google sur /login, tentative de régénération...');
        try {
          const walletAddress = authService.getWalletAddress();
          if (walletAddress) {
            const { token, expiresAt } = await authService.generateToken(walletAddress);
            if (token && expiresAt) {
              authService.saveToken(token, expiresAt, walletAddress);
              console.log('Token régénéré avec succès, redirection vers la page d\'accueil');
              router.push('/');
              return;
            }
          }
        } catch (error) {
          console.error('Erreur lors de la régénération du token:', error);
        }
      }
      
      // Si le token a expiré et ne peut pas être régénéré, rester sur /login
      if ('reason' in authState && authState.reason === 'token_expired' && !authState.canRegenerateToken) {
        console.log('Token expiré sur /login, utilisateur reste sur la page de connexion');
        return;
      }
      
      // Vérifier si l'utilisateur est authentifié
      const isAuthenticated = authState.isAuthenticated || walletConnected;
      
      if (isAuthenticated) {
        console.log('Utilisateur authentifié sur /login, redirection vers la page d\'accueil');
        router.push('/');
      }
    };
    
    // Délai pour éviter les conflits avec les redirections Next.js
    const timer = setTimeout(checkAuthAndRedirect, 200);
    
    return () => clearTimeout(timer);
  }, [isConnected, isAuthReady, router]);
  
  // Écouteur d'événements pour détecter la connexion du portefeuille
  useEffect(() => {
    // Vérifier périodiquement si l'utilisateur est connecté
    const checkWalletConnection = () => {
      // Si l'utilisateur est connecté mais que la redirection n'a pas encore eu lieu
      if (isConnected && isAuthReady) {
        console.log('Connexion wallet détectée, redirection vers la page d\'accueil');
        window.location.href = '/';
      }
    };
    
    // Vérifier toutes les 500ms
    const intervalId = setInterval(checkWalletConnection, 500);
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(intervalId);
  }, []);

  // Fonction pour gérer la connexion Google réussie
  const handleGoogleSuccess = async (credentialResponse: any) => {
    console.log('Connexion Google réussie:', credentialResponse);
    setLoading(true);
    
    try {
      // Vérifier si nous avons reçu un credential valide
      if (!credentialResponse || !credentialResponse.credential) {
        throw new Error('Aucun credential reçu de Google');
      }
      
      // Décoder le JWT Google pour obtenir l'ID utilisateur réel
      const googleToken = credentialResponse.credential;
      const base64Url = googleToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      // Utiliser l'ID Google réel
      const googleUserId = payload.sub; // 'sub' est l'ID unique Google
      const userEmail = payload.email;
      const userName = payload.name;
      
      console.log('Google User Info:', { googleUserId, userEmail, userName });
      
      // Stocker les informations Google complètes
      if (typeof window !== 'undefined') {
        localStorage.setItem(GOOGLE_USER_ID_KEY, googleUserId);
        localStorage.setItem('google_user_email', userEmail);
        localStorage.setItem('google_user_name', userName);
        
        // Créer un mapping Google ID -> Wallet Solana persistant
        const googleWalletMapping = JSON.parse(localStorage.getItem('google_wallet_mappings') || '{}');
        googleWalletMapping[googleUserId] = {
          email: userEmail,
          name: userName,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('google_wallet_mappings', JSON.stringify(googleWalletMapping));
      }
      
      // Générer un portefeuille Solana pour l'utilisateur Google
      const googleWallet = googleWalletService.getOrCreateGoogleWallet(googleUserId);
      console.log('Portefeuille Solana généré pour l\'utilisateur Google:', googleWallet?.publicKey);
      
      // Utiliser l'adresse du portefeuille généré comme identifiant pour l'authentification
      const walletAddress = googleWallet?.publicKey || googleUserId;
      
      // Créer un utilisateur Google-Wallet complet (association + utilisateur Solana)
      try {
        const googleUserData = {
          sub: googleUserId,
          email: userEmail,
          name: userName,
          picture: null
        };
        const publicKey = googleWallet?.publicKey || walletAddress;
        const userCreationResult = await authService.createGoogleWalletUser(
          googleUserData,
          walletAddress,
          publicKey
        );
        
        if (userCreationResult.success) {
          console.log('Utilisateur Google-Wallet complet créé:', userCreationResult);
        } else {
          console.error('Erreur lors de la création de l\'utilisateur complet:', userCreationResult);
        }
      } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur Google-Wallet:', error);
      }
      
      // Sauvegarder l'association Google-Wallet dans MongoDB
      try {
        await authService.saveGoogleWalletAssociation(googleUserId, userEmail, userName, walletAddress);
        console.log('Association Google-Wallet sauvegardée en base de données');
      } catch (error) {
        console.warn('Impossible de sauvegarder en base, utilisation du localStorage:', error);
      }
      
      // Utiliser le service d'authentification existant pour générer un token
      console.log('Génération du token JWT avec l\'adresse du portefeuille:', walletAddress);
      const { token, expiresAt } = await authService.generateToken(walletAddress);
      console.log('Token généré:', token ? 'OK' : 'Erreur');
      
      if (token && expiresAt) {
        console.log('Sauvegarde du token et configuration de l\'authentification...');
        // Sauvegarder le token et l'adresse du wallet avec authService
        authService.saveToken(token, expiresAt, walletAddress);
        
        // Définir explicitement les valeurs dans le localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('jwt_token', token);
          localStorage.setItem('token_expires_at', expiresAt.toString());
          localStorage.setItem(WALLET_ADDRESS_KEY, walletAddress);
          localStorage.setItem('isAuthReady', 'true');
          localStorage.setItem('isConnected', 'true');
          localStorage.setItem('isGoogleWallet', 'true'); // Indiquer que c'est un portefeuille Google
        }
        
        console.log('Authentification réussie, redirection dans 1 seconde...');
        
        // Ajouter un délai plus long avant la redirection pour permettre la synchronisation
        setTimeout(() => {
          console.log('Redirection vers la page d\'accueil...');
          // Redirection vers la page d'accueil après authentification réussie
          window.location.href = '/';
        }, 1000);
      } else {
        throw new Error('Échec de la génération du token');
      }
    } catch (error) {
      console.error('Erreur lors de l\'authentification Google:', error);
      alert('Échec de l\'authentification Google. Veuillez réessayer.');
      setLoading(false);
    }
  };

  // Fonction pour gérer l'échec de connexion Google
  const handleGoogleError = () => {
    console.error('Échec de la connexion Google');
    alert('Échec de la connexion Google. Veuillez réessayer.');
  };

  // Fonction pour gérer la connexion wallet - Déclencher le sélecteur
  const handleWalletLogin = async () => {
    setLoading(true);
    console.log('Ouverture du sélecteur de wallet...');
    
    try {
      // Essayer directement avec connectWallet du contexte
      console.log('Utilisation directe de connectWallet...');
      await connectWallet();
      
      // Attendre un peu pour voir si la connexion s'établit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Erreur lors de la connexion wallet:', error);
      alert('Erreur lors de la connexion wallet. Veuillez réessayer.');
    } finally {
      // Réinitialiser le loading
      setLoading(false);
    }
  };

  return (
    <div className="app login-page">
      {/* Background avec effet de flou */}
      <div className="background"></div>
      
      {/* Conteneur principal d'authentification */}
      <div className="auth-container">
        {/* Section de la mascotte à gauche */}
        <div className="mascot-section">
          <img src="/dsgx.png" alt="Mascotte" className="mascot-image" />
        </div>
        
        {/* Section de connexion à droite */}
        <div className="login-section">
          <img src="/welcome.png" alt="Welcome" className="login-title" />
          
          <Typography variant="body1" className="login-subtitle">
            Sign in to access your dashboard
          </Typography>
          
          {/* Bouton wallet personnalisé */}
          <div style={{ marginTop: '24px', width: '100%' }}>
            <button
              onClick={handleWalletLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#5856eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#6366f1';
                }
              }}
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
            
            {/* WalletMultiButton caché - le problème vient du double provider */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
              <WalletMultiButton className="wallet-adapter-button-trigger" />
            </div>
          </div>
          
          {/* Séparateur */}
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', margin: '20px 0' }}>
            <Box sx={{ flex: '1', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <Typography variant="body2" sx={{ margin: '0 10px', color: 'rgba(255, 255, 255, 0.6)' }}>
              OR
            </Typography>
            <Box sx={{ flex: '1', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </Box>
          
          {/* Bouton de connexion Google */}
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 1 }}>
            <GoogleOAuthProvider clientId="953938174658-bc0t3blb5hqb3cf9c2jgari174hepqn1.apps.googleusercontent.com">
              <div className="google-login-container">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="filled_blue"
                  text="continue_with"
                  shape="pill"
                  locale="fr"
                  width="280px"
                />
              </div>
            </GoogleOAuthProvider>
          </Box>
          
          {/* Note d'information */}
          <Typography variant="caption" sx={{ marginTop: 4, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
            By signing in, you agree to our terms of service and privacy policy.
          </Typography>
        </div>
      </div>
      
      {/* Particules animées pour effet visuel (CSS uniquement) */}
      <div id="particles-container"></div>
      
      <footer>
        <p className="copyright"> 2024 Last Parad0x vPN — All rights reserved</p>
        <div className="social-links">
          <a href="https://discord.gg/w4xvwUQg" target="_blank" rel="noopener noreferrer" className="social-link">Discord</a>
          <a href="https://x.com/LastParadox__" target="_blank" rel="noopener noreferrer" className="social-link">Twitter</a>
          <a href="https://github.com/Lastexitfromnowhere" target="_blank" rel="noopener noreferrer" className="social-link">GitHub</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
