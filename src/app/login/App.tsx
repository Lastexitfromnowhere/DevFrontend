import React, { useEffect } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import { AccountBalanceWallet } from '@mui/icons-material';
import { useWalletContext } from '@/contexts/WalletContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { authService } from '@/services/authService';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Constantes pour le stockage local (doivent correspondre à celles de authService.js)
const WALLET_ADDRESS_KEY = 'wallet_address';

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
    if (isConnected && isAuthReady) {
      router.push('/');
    }
  }, [isConnected, isAuthReady, router]);

  // Fonction pour gérer la connexion Google réussie
  const handleGoogleSuccess = async (credentialResponse: any) => {
    console.log('Connexion Google réussie:', credentialResponse);
    setLoading(true);
    
    try {
      // Décoder le token Google pour obtenir des informations utilisateur
      // Dans un environnement de production, vous devriez vérifier le token côté serveur
      const googleUserId = `google-${Date.now()}`;
      
      // Utiliser le service d'authentification existant pour générer un token
      const { token, expiresAt } = await authService.generateToken(googleUserId);
      
      if (token && expiresAt) {
        // Sauvegarder le token et l'adresse du wallet (googleUserId) avec authService
        authService.saveToken(token, expiresAt, googleUserId);
        
        // Synchroniser l'adresse du wallet dans tous les emplacements de stockage
        authService.synchronizeWalletAddress(googleUserId);
        
        // Simuler une connexion wallet pour que le WalletContext considère l'utilisateur comme connecté
        // Cela permettra d'afficher les récompenses même sans wallet connecté
        localStorage.setItem('isAuthReady', 'true');
        localStorage.setItem('isConnected', 'true');
        localStorage.setItem(WALLET_ADDRESS_KEY, googleUserId); // Utiliser la même clé que dans authService
        
        // Ajouter un délai avant la redirection pour permettre la synchronisation
        setTimeout(() => {
          // Redirection vers la page d'accueil après authentification réussie
          window.location.href = '/';
        }, 500);
      } else {
        throw new Error('Échec de l\'authentification');
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

  // Fonction pour gérer la connexion wallet
  const handleWalletLogin = () => {
    setLoading(true);
    
    try {
      // Ouvrir le sélecteur de portefeuille en utilisant le bouton WalletMultiButton
      // Nous créons un événement personnalisé pour simuler un clic sur le bouton WalletMultiButton
      const walletButtons = document.getElementsByClassName('wallet-adapter-button');
      
      if (walletButtons && walletButtons.length > 0) {
        // Simuler un clic sur le premier bouton de portefeuille trouvé
        (walletButtons[0] as HTMLElement).click();
      } else {
        // Si le bouton n'est pas trouvé, essayer d'utiliser la fonction connectWallet du contexte
        connectWallet();
      }
      
      // Désactiver le chargement car le sélecteur de portefeuille gère son propre état
      setLoading(false);
      
      // La redirection sera gérée par l'effet qui surveille isConnected et isAuthReady
    } catch (error) {
      console.error('Erreur lors de la connexion wallet:', error);
      alert('Erreur lors de la connexion wallet. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Background avec effet de flou */}
      <div className="background"></div>
      
      {/* Conteneur principal d'authentification */}
      <div className="auth-container">
        {/* Section de la mascotte à gauche */}
        <div className="mascot-section">
          <img src="/image.png" alt="Mascotte" className="mascot-image" />
        </div>
        
        {/* Section de connexion à droite */}
        <div className="login-section">
          <Typography variant="h4" className="login-title">
            Welcome
          </Typography>
          
          <Typography variant="body1" className="login-subtitle">
            Sign in to access your dashboard
          </Typography>
          
          {/* Bouton de connexion wallet */}
          <Button 
            variant="contained"
            className="login-button wallet-button"
            onClick={handleWalletLogin}
            startIcon={<AccountBalanceWallet />}
            disabled={loading}
            fullWidth
            sx={{ 
              marginTop: 3,
              backgroundColor: 'rgba(0, 195, 255, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(0, 195, 255, 0.5)',
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Connect with Wallet'}
          </Button>
          
          {/* WalletMultiButton caché pour permettre l'ouverture du sélecteur de portefeuille */}
          <div style={{ position: 'absolute', visibility: 'hidden' }}>
            <WalletMultiButton className="wallet-adapter-button" />
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
    </div>
  );
}

export default App;
