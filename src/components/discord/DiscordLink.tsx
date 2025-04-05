import React, { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { config } from '@/config/env';
import axios from 'axios';
import { authService } from '@/services/authService';
import { useRewards } from '@/hooks/useRewards';
import { Spinner } from '../ui/Spinner';
import { Card } from '../ui/Card';
import { DashboardButton } from '../ui/DashboardButton';
import { DashboardBadge } from '../ui/DashboardBadge';
import { MessageCircle, Award, Bell, BellOff, ExternalLink, Coins } from 'lucide-react';

// URL de base pour les requêtes Discord
const DISCORD_API_BASE = `${config.API_BASE_URL}/discord`;

interface DiscordLinkState {
  linked: boolean;
  discordUsername: string | null;
  discordAvatar: string | null;
  discordId: string | null;
  notifyDailyClaims: boolean;
  isEarlyContributor: boolean;
  registrationOrder: number | null;
}

export default function DiscordLink() {
  const { isConnected, account } = useWalletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discordState, setDiscordState] = useState<DiscordLinkState>({
    linked: false,
    discordUsername: null,
    discordAvatar: null,
    discordId: null,
    notifyDailyClaims: true,
    isEarlyContributor: false,
    registrationOrder: null
  });
  
  // Utiliser le hook useRewards pour récupérer le solde des rewards
  const { stats: rewardsStats, isLoading: rewardsLoading } = useRewards();

  // Fonction pour vérifier si le serveur Discord est accessible
  const checkDiscordServer = async () => {
    try {
      // Essayer d'accéder à la route de diagnostic sans authentification
      const response = await axios.get(`${config.API_BASE_URL}/discord/link-debug`);
      console.log('Discord server check response:', response);
      // Utiliser une assertion de type pour indiquer à TypeScript que nous connaissons la structure
      const responseData = response.data as { success: boolean };
      return responseData.success;
    } catch (error) {
      console.error('Erreur lors de la vérification du serveur Discord:', error);
      return false;
    }
  };

  // Fonction pour récupérer le statut de liaison Discord
  const fetchDiscordStatus = async () => {
    if (!isConnected || !account) {
      console.log('❌ Wallet non connecté, impossible de vérifier le statut Discord');
      setError('Veuillez connecter votre wallet pour vérifier votre statut Discord');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Vérifier que le token est valide avant de continuer
      await authService.refreshTokenIfNeeded();
      
      // Récupérer les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      // Faire la requête pour récupérer le statut Discord
      const response = await axios.get(`${DISCORD_API_BASE}/status`, { headers });
      console.log('📝 Réponse du statut Discord:', response.data);
      
      // Utiliser une assertion de type pour indiquer à TypeScript que nous connaissons la structure
      const responseData = response.data as {
        linked: boolean;
        discordUsername?: string;
        discordAvatar?: string;
        discordId?: string;
        notifyDailyClaims?: boolean;
        isEarlyContributor?: boolean;
        registrationOrder?: number;
      };
      
      // Mettre à jour l'état avec les informations reçues
      setDiscordState(prevState => ({
        ...prevState,
        linked: responseData.linked || false,
        discordUsername: responseData.discordUsername || null,
        discordAvatar: responseData.discordAvatar || null,
        discordId: responseData.discordId || null,
        notifyDailyClaims: responseData.notifyDailyClaims !== undefined ? responseData.notifyDailyClaims : true,
        isEarlyContributor: responseData.isEarlyContributor || false,
        registrationOrder: responseData.registrationOrder || null
      }));
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération du statut Discord:', error);
      setError(`Erreur lors de la récupération du statut Discord: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cette fonction a été remplacée par la version plus bas dans le code
  
  // Fonction pour délier le compte Discord
  const unlinkDiscord = async () => {
    if (!isConnected || !account) {
      setError('Veuillez connecter votre wallet pour délier votre compte Discord');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Vérifier que le token est valide avant de continuer
      await authService.refreshTokenIfNeeded();
      
      // Récupérer les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      // Faire la requête pour délier le compte Discord
      await axios.post(`${DISCORD_API_BASE}/unlink`, {}, { headers });
      
      // Rafraîchir le statut Discord
      await fetchDiscordStatus();
      
      // Afficher une alerte de succès
      alert('Votre compte Discord a été délié avec succès!');
    } catch (error: any) {
      console.error('❌ Erreur lors de la déliaison Discord:', error);
      setError(`Erreur lors de la déliaison Discord: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour activer/désactiver les notifications de daily claims
  const toggleNotifications = async () => {
    if (!isConnected || !account) {
      setError('Veuillez connecter votre wallet pour modifier vos préférences de notification');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Vérifier que le token est valide avant de continuer
      await authService.refreshTokenIfNeeded();
      
      // Récupérer les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      // Faire la requête pour modifier les préférences de notification
      await axios.post(`${DISCORD_API_BASE}/toggle-notifications`, {
        notifyDailyClaims: !discordState.notifyDailyClaims
      }, { headers });
      
      // Mettre à jour l'état local
      setDiscordState(prevState => ({
        ...prevState,
        notifyDailyClaims: !prevState.notifyDailyClaims
      }));
    } catch (error: any) {
      console.error('❌ Erreur lors de la modification des préférences de notification:', error);
      setError(`Erreur lors de la modification des préférences: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cette fonction a été remplacée par la version plus complète plus bas dans le code

  // Fonction pour rediriger vers l'authentification Discord
  const handleDiscordLink = async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    try {
      // Utiliser directement l'URL d'authentification Discord avec les paramètres nécessaires
      const DISCORD_CLIENT_ID = '1341850853488984107'; // Utiliser l'ID client de votre fichier .env
      const REDIRECT_URI = encodeURIComponent('https://lastexitvpn.duckdns.org/discord/callback');
      const state = Buffer.from(JSON.stringify({ walletAddress: account })).toString('base64');
      
      // Construire l'URL d'authentification Discord
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify&state=${state}`;
      
      console.log('Redirecting to Discord auth URL:', discordAuthUrl);
      
      // Rediriger vers l'URL d'authentification Discord
      window.location.href = discordAuthUrl;
    } catch (error: any) {
      console.error('Error initiating Discord auth:', error);
      setError(error.message || 'Échec de l\'initialisation de l\'authentification Discord');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour vérifier si l'utilisateur est un early contributor
  const checkEarlyContributor = async (headers: any) => {
    try {
      const response = await axios.get(`${DISCORD_API_BASE}/early-contributor`, {
        headers
      });
      
      console.log('Early contributor response:', response);
      
      const responseData = response.data as any;
      
      if (responseData.success) {
        setDiscordState(prevState => ({
          ...prevState,
          isEarlyContributor: responseData.isEarlyContributor || false,
          registrationOrder: responseData.registrationOrder || null
        }));
      }
    } catch (error: any) {
      console.error('Error checking early contributor status:', error);
      // Ne pas afficher d'erreur à l'utilisateur pour cette vérification
    }
  };

  // Fonction de débogage pour afficher les informations de token et d'état
  const debugTokenAndStatus = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Début du débogage de liaison Discord...');
      
      // Vérifier l'état de connexion du wallet
      console.log('📝 État du wallet:', {
        isConnected,
        account
      });
      
      // Vérifier le token JWT
      const token = localStorage.getItem('auth_token');
      const walletAddress = localStorage.getItem('wallet_address');
      console.log('📝 Informations du localStorage:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        walletAddress
      });
      
      // Vérifier si le token est expiré
      const isExpired = authService.isTokenExpired();
      console.log('📝 Token expiré?', isExpired ? 'Oui' : 'Non');
      
      // Essayer de rafraîchir le token
      const refreshResult = await authService.refreshTokenIfNeeded();
      console.log('📝 Résultat du rafraîchissement du token:', refreshResult ? 'Succès' : 'Échec');
      
      // Récupérer les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      console.log('📝 En-têtes d\'authentification:', headers);
      
      // Tester la connexion au backend
      try {
        const response = await axios.get(`${config.API_BASE_URL}/status`, { headers });
        console.log('✅ Connexion au backend réussie:', response.data);
      } catch (error: any) {
        console.error('❌ Erreur de connexion au backend:', error);
      }
      
      // Rafraîchir le statut Discord
      await fetchDiscordStatus();
      
      console.log('📝 État actuel de liaison Discord:', discordState);
      alert('Débogage terminé. Consultez la console pour plus de détails.');
    } catch (error: any) {
      console.error('❌ Erreur lors du débogage:', error);
      setError(`Erreur de débogage: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier si le compte est lié lors du chargement du composant
  useEffect(() => {
    // Vérifier si nous avons un code d'autorisation dans l'URL (après redirection de Discord)
    const checkForDiscordCode = async () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        if (error) {
          console.error('❌ Erreur de redirection Discord:', error);
          const errorDescription = urlParams.get('error_description');
          setError(`Erreur Discord: ${errorDescription || error}`);
          // Nettoyer l'URL pour supprimer les paramètres
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          return;
        }
        
        if (code && state) {
          console.log('🔑 Code d\'autorisation Discord détecté:', code.substring(0, 10) + '...');
          console.log('📝 State détecté:', state);
          
          try {
            setIsLoading(true);
            
            // Vérifier que le token est valide avant de continuer
            await authService.refreshTokenIfNeeded();
            
            // Nettoyer l'URL pour supprimer les paramètres
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Attendre un peu pour laisser le temps au backend de traiter la liaison
            console.log('⏳ Attente de 2 secondes pour laisser le backend traiter la liaison...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Rafraîchir le statut Discord
            await fetchDiscordStatus();
            
            // Afficher une alerte de succès
            alert('Votre compte Discord a été lié avec succès!');
          } catch (error: any) {
            console.error('❌ Erreur lors du traitement du code d\'autorisation Discord:', error);
            setError(`Erreur lors de la liaison Discord: ${error.message}`);
          } finally {
            setIsLoading(false);
          }
        }
      }
    };
    
    // Vérifier si le compte est connecté et récupérer le statut Discord
    if (isConnected && account) {
      fetchDiscordStatus();
    }
    
    checkForDiscordCode();
  }, [isConnected, account]);

  // Rendu conditionnel si le wallet n'est pas connecté
  if (!isConnected) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg text-center">
        <p className="text-gray-400">Veuillez connecter votre portefeuille pour lier votre compte Discord</p>
      </Card>
    );
  }

  // Rendu principal du composant
  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 space-y-6">
      {/* En-tête avec titre */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-indigo-500/20 backdrop-blur-sm">
            <MessageCircle className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Intégration Discord</h3>
        </div>
        {isLoading && <Spinner />}
      </div>
      
      {error && (
        <div className="bg-red-900/50 text-red-200 p-3 rounded-md mb-4">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-xs underline"
          >
            Fermer
          </button>
        </div>
      )}

    {isLoading ? (
      <div className="flex justify-center items-center py-8">
        <Spinner />
      </div>
    ) : discordState.linked ? (
      <div className="space-y-4">
        {/* Informations du compte Discord lié */}
        <div className="flex items-center space-x-4">
          {discordState.discordAvatar ? (
            <img 
              src={`https://cdn.discordapp.com/avatars/${discordState.discordId}/${discordState.discordAvatar}.png`} 
              alt="Avatar Discord" 
              className="w-12 h-12 rounded-full border-2 border-indigo-500"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-500/30 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-indigo-300" />
            </div>
          )}
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <p className="text-white font-medium">{discordState.discordUsername}</p>
              <DashboardBadge variant="success" className="ml-2">
                <span className="text-xs font-medium">PAIRED</span>
              </DashboardBadge>
            </div>
            <p className="text-gray-400 text-sm">Compte Discord associé à votre wallet</p>
          </div>
        </div>

        {/* Badge Early Contributor si applicable */}
        {discordState.isEarlyContributor && (
          <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 p-3 rounded-lg">
            <Award className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-white font-medium">Early Contributor</p>
              <p className="text-gray-400 text-xs">Vous faites partie des 5000 premiers contributeurs !</p>
            </div>
          </div>
        )}
        
        {/* Affichage du solde des rewards */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-3 rounded-lg mt-3">
          <Coins className="w-5 h-5 text-indigo-400" />
          <div>
            <p className="text-white font-medium">Solde de rewards</p>
            <p className="text-indigo-300 font-bold">
              {rewardsLoading ? (
                <span className="flex items-center">
                  <Spinner size="sm" className="mr-2" />
                  Chargement...
                </span>
              ) : (
                `${rewardsStats.totalRewards} RWRD`
              )}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 mt-4">
          {/* Bouton pour déconnecter Discord */}
          <DashboardButton 
            onClick={unlinkDiscord}
            className="bg-red-700 hover:bg-red-600"
          >
            <MessageCircle className="mr-2" />
            Déconnecter Discord
          </DashboardButton>
          
          {/* Bouton pour déboguer la connexion */}
          <DashboardButton 
            onClick={debugTokenAndStatus}
            className="bg-gray-700 hover:bg-gray-600 text-sm"
          >
            🔍 Déboguer la connexion
          </DashboardButton>
          
          {/* Bouton pour activer/désactiver les notifications de daily claims */}
          <DashboardButton
            onClick={toggleNotifications}
            className={`flex items-center justify-between ${discordState.notifyDailyClaims ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <div className="flex items-center">
              {discordState.notifyDailyClaims ? (
                <Bell className="mr-2 h-5 w-5" />
              ) : (
                <BellOff className="mr-2 h-5 w-5" />
              )}
              <span>Notifications Discord</span>
            </div>
            <span className="text-xs bg-black/20 px-2 py-1 rounded">
              {discordState.notifyDailyClaims ? "Activées" : "Désactivées"}
            </span>
          </DashboardButton>
        </div>
        
        <p className="text-gray-400 text-xs mt-3">
          {discordState.notifyDailyClaims 
            ? "Vous recevrez des messages privés sur Discord lorsque vos récompenses quotidiennes seront disponibles." 
            : "Vous ne recevrez pas de notifications pour vos récompenses quotidiennes."}
        </p>
      </div>
    ) : (
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-medium">Statut de liaison</h4>
          <DashboardBadge variant="danger" className="ml-2">
            <span className="text-xs font-medium">NOT PAIRED</span>
          </DashboardBadge>
        </div>
        <p className="text-gray-300">
          Liez votre compte Discord pour recevoir des notifications de daily claims et obtenir le rôle "Early Contributor" si vous êtes parmi les 5000 premiers utilisateurs.
        </p>
        <div className="flex flex-col space-y-3 mt-4">
          <DashboardButton 
            onClick={handleDiscordLink}
            className="bg-indigo-700 hover:bg-indigo-600 w-full"
            disabled={!isConnected || isLoading}
          >
            <MessageCircle className="mr-2" />
            {isLoading ? 'Connexion en cours...' : 'Connecter Discord'}
          </DashboardButton>
          
          <DashboardButton 
            onClick={debugTokenAndStatus}
            className="bg-gray-700 hover:bg-gray-600 text-sm"
            disabled={isLoading}
          >
            🔍 Déboguer la connexion
          </DashboardButton>
        </div>
      </div>
    )}
  </Card>
  );
}
