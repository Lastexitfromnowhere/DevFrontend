import React, { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { config } from '@/config/env';
import axios from 'axios';
import { authService } from '@/services/authService';
import { Spinner } from '../ui/Spinner';
import { Card } from '../ui/Card';
import { DashboardButton } from '../ui/DashboardButton';
import { DashboardBadge } from '../ui/DashboardBadge';
import { MessageCircle, Award, Bell, BellOff, ExternalLink } from 'lucide-react';

// URL de base pour les requêtes Discord
const DISCORD_API_BASE = `${config.API_BASE_URL}/api/discord`;

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

  // Fonction pour vérifier si le serveur Discord est accessible
  const checkDiscordServer = async () => {
    try {
      // Essayer d'accéder à la route de diagnostic sans authentification
      const response = await axios.get(`${config.API_BASE_URL}/discord-debug`);
      console.log('Discord server check response:', response);
      // Utiliser une assertion de type pour indiquer à TypeScript que nous connaissons la structure
      const responseData = response.data as { success: boolean };
      return responseData.success;
    } catch (error) {
      console.error('Error checking Discord server:', error);
      return false;
    }
  };

  // Fonction pour récupérer le statut de liaison Discord
  const fetchDiscordStatus = async () => {
    if (!isConnected || !account) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    try {
      // Vérifier d'abord si le serveur Discord est accessible
      const isServerAccessible = await checkDiscordServer();
      if (!isServerAccessible) {
        throw new Error('Le serveur Discord n\'est pas accessible');
      }
      
      // Vérifier que le token est valide et le rafraîchir si nécessaire
      await authService.refreshTokenIfNeeded();
      
      // Obtenir les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      try {
        // Essayer d'abord la route de diagnostic sans authentification
        const debugResponse = await axios.get(`${config.API_BASE_URL}/discord/link-debug`);
        console.log('Discord debug response:', debugResponse);
      } catch (debugError) {
        console.warn('Debug route not accessible:', debugError);
      }
      
      const response = await axios.get(`${DISCORD_API_BASE}/link`, {
        headers
      });
      
      console.log('Discord status response:', response);
      
      const responseData = response.data as any;
      
      if (responseData.success) {
        setDiscordState({
          linked: responseData.isLinked || false,
          discordUsername: responseData.discordUser?.username || null,
          discordAvatar: responseData.discordUser?.avatar || null,
          discordId: responseData.discordUser?.id || null,
          notifyDailyClaims: true, // Valeur par défaut
          isEarlyContributor: false, // Vérifier séparément
          registrationOrder: null // Vérifier séparément
        });
        
        // Si le compte est lié, vérifier le statut d'early contributor
        if (responseData.isLinked) {
          checkEarlyContributor(headers);
        }
      } else {
        setError(responseData.message || 'Failed to fetch Discord status');
      }
    } catch (error: any) {
      console.error('Error fetching Discord status:', error);
      setError(error.message || 'Failed to fetch Discord status');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour activer/désactiver les notifications de daily claims
  const toggleNotifications = async () => {
    if (!isConnected || !account || !discordState.linked) {
      setError('Wallet not connected or Discord not linked');
      return;
    }

    setIsLoading(true);
    try {
      // Vérifier que le token est valide et le rafraîchir si nécessaire
      await authService.refreshTokenIfNeeded();
      
      // Obtenir les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      const response = await axios.post(`${DISCORD_API_BASE}/notifications/daily-claims`, {
        enabled: !discordState.notifyDailyClaims
      }, {
        headers
      });
      
      console.log('Toggle notifications response:', response);
      
      const responseData = response.data as any;
      
      if (responseData.success) {
        setDiscordState({
          ...discordState,
          notifyDailyClaims: !discordState.notifyDailyClaims
        });
      } else {
        setError(responseData.message || 'Failed to update notification preferences');
      }
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      setError(error.message || 'Failed to update notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Récupérer le statut Discord au chargement du composant
  useEffect(() => {
    if (isConnected && account) {
      fetchDiscordStatus();
    }
  }, [isConnected, account]);

  if (!isConnected) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg text-center">
        <p className="text-gray-400">Veuillez connecter votre portefeuille pour lier votre compte Discord</p>
      </Card>
    );
  }

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
        {error && (
          <DashboardBadge variant="danger">
            <span className="text-xs">{error}</span>
          </DashboardBadge>
        )}
      </div>

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
            <div>
              <p className="text-white font-medium">{discordState.discordUsername}</p>
              <p className="text-gray-400 text-sm">Compte Discord lié</p>
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

          {/* Préférences de notification */}
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {discordState.notifyDailyClaims ? (
                  <Bell className="w-5 h-5 text-green-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <p className="text-white">Notifications de daily claims</p>
              </div>
              <DashboardButton
                onClick={toggleNotifications}
                variant={discordState.notifyDailyClaims ? "success" : "secondary"}
                size="sm"
              >
                {discordState.notifyDailyClaims ? "Activées" : "Désactivées"}
              </DashboardButton>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              {discordState.notifyDailyClaims 
                ? "Vous recevrez des messages privés sur Discord lorsque vos récompenses quotidiennes seront disponibles." 
                : "Vous ne recevrez pas de notifications pour vos récompenses quotidiennes."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-4">
          <p className="text-gray-300">
            Liez votre compte Discord pour recevoir des notifications de daily claims et obtenir le rôle "Early Contributor" si vous êtes parmi les 5000 premiers utilisateurs.
          </p>
          <DashboardButton
            onClick={handleDiscordLink}
            variant="primary"
            className="w-full flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Lier mon compte Discord</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </DashboardButton>
        </div>
      )}
    </Card>
  );
}
