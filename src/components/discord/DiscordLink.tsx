import React, { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { config } from '@/config/env';
import axios from 'axios';
import { authService } from '@/services/authService';
import { useRewards } from '@/hooks/useRewards';
import { Spinner } from '../ui/Spinner';
import { Card } from '../ui/Card';
import { DashboardBadge } from '../ui/DashboardBadge';
import { MessageCircle, Award, Bell, BellOff, Unlink, Coins } from 'lucide-react';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';

// URL de base pour les requêtes Discord
const DISCORD_API_BASE = `${config.API_BASE_URL}/discord`;
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '';

const getRedirectUri = () => {
  if (typeof window !== 'undefined') {
    return encodeURIComponent(`${window.location.origin}/discord-callback`);
  }
  // Fallback pour le SSR
  return encodeURIComponent(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/discord-callback`);
};

const setLocalStorageState = (state: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('discordAuthState', state);
  }
};

interface DiscordLinkState {
  linked: boolean;
  discordUsername: string | null;
  discordAvatar: string | null;
  discordId: string | null;
  notifyDailyClaims: boolean;
  isEarlyContributor: boolean;
  registrationOrder: number | null;
}

interface DiscordStatusResponse {
  linked: boolean;
  discordUsername?: string;
  discordAvatar?: string;
  discordId?: string;
  notifyDailyClaims?: boolean;
  isEarlyContributor?: boolean;
  registrationOrder?: number;
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
  
  const { stats: rewardsData, isLoading: rewardsLoading } = useRewards();

  const checkDiscordServer = async () => {
    try {
      await axios.get(`${DISCORD_API_BASE}/status`);
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification du serveur Discord:', error);
      return false;
    }
  };

  const generateDiscordAuthUrl = () => {
    const state = Math.random().toString(36).substring(2, 15);
    setLocalStorageState(state);
    const redirectUri = getRedirectUri();
    return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${state}`;
  };

  const handleDiscordLink = async () => {
    if (!isConnected || !account) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Vérifier d'abord si le compte est déjà lié
      const token = authService.getToken();
      if (!token) {
        setError("Vous n'êtes pas authentifié. Veuillez vous connecter.");
        setIsLoading(false);
        return;
      }

      const response = await axios.get<DiscordStatusResponse>(`${DISCORD_API_BASE}/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          walletAddress: account
        }
      });

      if (response.data && response.data.linked) {
        setError("Ce wallet est déjà lié à un compte Discord.");
        setIsLoading(false);
        return;
      }
      
      const isServerAvailable = await checkDiscordServer();
      if (!isServerAvailable) {
        setError("Le serveur Discord n'est pas accessible pour le moment. Veuillez réessayer plus tard.");
        setIsLoading(false);
        return;
      }
      
      window.location.href = generateDiscordAuthUrl();
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
      setError("Une erreur est survenue lors de la vérification du statut. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  const handleDiscordUnlink = async () => {
    if (!isConnected || !account) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = authService.getToken();
      if (!token) {
        setError("Vous n'êtes pas authentifié. Veuillez vous connecter.");
        setIsLoading(false);
        return;
      }
      
      await axios.delete(`${DISCORD_API_BASE}/unlink`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          walletAddress: account
        }
      });
      
      setDiscordState({
        linked: false,
        discordUsername: null,
        discordAvatar: null,
        discordId: null,
        notifyDailyClaims: true,
        isEarlyContributor: false,
        registrationOrder: null
      });
      
      alert("Votre compte Discord a été délié avec succès.");
    } catch (error) {
      console.error('Erreur lors du délien du compte Discord:', error);
      setError("Une erreur est survenue lors du délien de votre compte Discord. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationToggle = async () => {
    if (!isConnected || !account || !discordState.linked) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = authService.getToken();
      if (!token) {
        setError("Vous n'êtes pas authentifié. Veuillez vous connecter.");
        setIsLoading(false);
        return;
      }
      
      await axios.post(`${DISCORD_API_BASE}/preferences`, {
        notifyDailyClaims: !discordState.notifyDailyClaims
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setDiscordState(prev => ({
        ...prev,
        notifyDailyClaims: !prev.notifyDailyClaims
      }));
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences de notification:', error);
      setError("Une erreur est survenue lors de la mise à jour de vos préférences de notification. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkDiscordStatus = async () => {
    if (!isConnected || !account) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = authService.getToken();
      if (!token) {
        setError("Vous n'êtes pas authentifié. Veuillez vous connecter.");
        setIsLoading(false);
        return;
      }
      
      const response = await axios.get<DiscordStatusResponse>(`${DISCORD_API_BASE}/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          walletAddress: account
        }
      });
      
      // Mettre à jour l'état que le compte soit lié ou non
      setDiscordState({
        linked: response.data.linked || false,
        discordUsername: response.data.discordUsername || null,
        discordAvatar: response.data.discordAvatar || null,
        discordId: response.data.discordId || null,
        notifyDailyClaims: response.data.notifyDailyClaims !== undefined ? response.data.notifyDailyClaims : true,
        isEarlyContributor: response.data.isEarlyContributor || false,
        registrationOrder: response.data.registrationOrder || null
      });
    } catch (error) {
      console.error('Erreur lors de la vérification du statut Discord:', error);
      // En cas d'erreur, réinitialiser l'état
      setDiscordState({
        linked: false,
        discordUsername: null,
        discordAvatar: null,
        discordId: null,
        notifyDailyClaims: true,
        isEarlyContributor: false,
        registrationOrder: null
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = authService.getToken();
      if (!token) {
        setError("Vous n'êtes pas authentifié. Veuillez vous connecter.");
        setIsLoading(false);
        return;
      }
      
      await axios.post(`${DISCORD_API_BASE}/callback`, {
        code,
        redirectUri: decodeURIComponent(getRedirectUri()),
        walletAddress: account
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      await checkDiscordStatus();
      alert("Votre compte Discord a été lié avec succès.");
    } catch (error) {
      console.error('Erreur lors de l\'échange du code d\'autorisation:', error);
      setError("Une erreur est survenue lors de la liaison de votre compte Discord. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkForDiscordCode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const storedState = localStorage.getItem('discordAuthState');
      
      if (code && state && state === storedState) {
        localStorage.removeItem('discordAuthState');
        window.history.replaceState({}, document.title, window.location.pathname);
        exchangeCodeForToken(code);
      }
    };
    
    if (isConnected && account) {
      checkDiscordStatus();
    }
    
    checkForDiscordCode();
  }, [isConnected, account]);

  if (!isConnected) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg text-center">
        <p className="text-gray-400">Veuillez connecter votre portefeuille pour lier votre compte Discord</p>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-3 rounded-lg shadow-lg transition-all duration-500 mx-auto mb-4">
      {error && (
        <div className="bg-red-900/50 text-red-200 p-2 rounded-md mb-2 text-xs">
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
        <div className="flex justify-center items-center py-2">
          <Spinner />
        </div>
      ) : discordState.linked ? (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            {discordState.discordAvatar ? (
              <img 
                src={`https://cdn.discordapp.com/avatars/${discordState.discordId}/${discordState.discordAvatar}.png`} 
                alt="Avatar Discord" 
                className="w-8 h-8 rounded-full border border-indigo-500"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-indigo-300" />
              </div>
            )}
            <div>
              <div className="flex items-center">
                <p className="text-white text-sm font-medium">{discordState.discordUsername}</p>
                <DashboardBadge variant="success" className="ml-2">
                  <span className="text-xs font-medium">PAIRED</span>
                </DashboardBadge>
              </div>
            </div>
          </div>

          {discordState.isEarlyContributor && (
            <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 p-1.5 rounded-md">
              <Award className="w-3.5 h-3.5 text-yellow-400" />
              <p className="text-white text-xs font-medium">Early Contributor</p>
            </div>
          )}
          
          <div className="flex items-center space-x-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-1.5 rounded-md">
            <Coins className="w-3.5 h-3.5 text-indigo-400" />
            <p className="text-white text-xs font-medium">
              {rewardsLoading ? (
                <span className="flex items-center">
                  <Spinner size="sm" className="mr-1" />
                  Chargement...
                </span>
              ) : (
                `${rewardsData?.totalRewards || 0} WIND`
              )}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              checked={discordState.notifyDailyClaims} 
              onCheckedChange={handleNotificationToggle}
              disabled={isLoading}
            />
            <span className="text-white text-xs">
              {discordState.notifyDailyClaims ? "Notifications activées" : "Notifications désactivées"}
            </span>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleDiscordUnlink}
            disabled={isLoading}
            className="text-xs py-1 px-2 h-auto"
          >
            <Unlink className="w-3 h-3 mr-1" />
            Délier
          </Button>
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
          <Button 
            onClick={handleDiscordLink}
            className="bg-indigo-700 hover:bg-indigo-600 w-full"
            disabled={!isConnected || isLoading}
          >
            <MessageCircle className="mr-2" />
            {isLoading ? 'Connexion en cours...' : 'Connecter Discord'}
          </Button>
        </div>
      )}
    </Card>
  );
}
