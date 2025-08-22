import React, { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { config } from '@/config/env';
import axios from 'axios';
import { authService } from '@/services/authService';
import { Spinner } from '../ui/Spinner';
import { Card } from '../ui/Card';
import { DashboardBadge } from '../ui/DashboardBadge';
import { MessageCircle, Award, Unlink, LogIn, Link } from 'lucide-react';
import { Button } from '../ui/Button';
const DISCORD_API_BASE = `${config.API_BASE_URL}/discord`;
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '';
const DISCORD_INVITE_LINK = 'https:
const getRedirectUri = () => {
  return encodeURIComponent('https:
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
interface DiscordLinkResponse {
  success: boolean;
  message?: string;
  discordUsername?: string;
  discordAvatar?: string;
  discordId?: string;
  isEarlyContributor?: boolean;
  notifyDailyClaims?: boolean;
}
export default function DiscordLink() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      exchangeCodeForToken(code);
    }
  }, []);
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
    if (!account) {
      throw new Error("Aucun wallet connecté");
    }
    const isGoogleWallet = typeof window !== 'undefined' ? localStorage.getItem('isGoogleWallet') === 'true' : false;
    const stateObj = { 
      walletAddress: account,
      isGoogleWallet: isGoogleWallet
    };
    const state = btoa(JSON.stringify(stateObj));
    setLocalStorageState(state);
    const redirectUri = getRedirectUri();
    if (!DISCORD_CLIENT_ID) {
      console.warn('[Discord] DISCORD_CLIENT_ID is not defined!');
    }
    const scopes = ['identify', 'guilds.join'].join('%20');
    const url = `https:
    console.log('[Discord] URL générée pour OAuth2:', url);
    console.log('[Discord] DISCORD_CLIENT_ID:', DISCORD_CLIENT_ID);
    return url;
  };
  const handleDiscordLink = async () => {
    if (!isConnected || !account) return;
    setIsLoading(true);
    setError(null);
    try {
      const serverAvailable = await checkDiscordServer();
      if (!serverAvailable) {
        setError("Le serveur Discord est actuellement indisponible. Veuillez réessayer plus tard.");
        setIsLoading(false);
        return;
      }
      const authUrl = generateDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Erreur lors de la redirection vers Discord:', error);
      setError("Une erreur est survenue lors de la redirection vers Discord. Veuillez réessayer.");
      setIsLoading(false);
    }
  };
  const exchangeCodeForToken = async (code: string) => {
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
      const response = await axios.post<DiscordLinkResponse>(`${DISCORD_API_BASE}/complete-link`, {
        code
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Réponse de liaison Discord:', response.data);
      if (response.data.success) {
        setDiscordState(prev => ({
          ...prev,
          linked: true,
          discordUsername: response.data.discordUsername || null,
          discordAvatar: response.data.discordAvatar || null,
          discordId: response.data.discordId || null,
          isEarlyContributor: response.data.isEarlyContributor || false
        }));
        window.location.href = 'https:
      } else {
        setError(response.data.message || "Une erreur est survenue lors de la liaison avec Discord.");
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'échange du code:', error);
      setError(error.response?.data?.message || "Une erreur est survenue lors de la liaison avec Discord.");
    } finally {
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
      const response = await axios.delete<DiscordLinkResponse>(`${DISCORD_API_BASE}/link`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Réponse de déliaison Discord:', response.data);
      if (response.data.success) {
        setDiscordState({
          linked: false,
          discordUsername: null,
          discordAvatar: null,
          discordId: null,
          notifyDailyClaims: true,
          isEarlyContributor: false,
          registrationOrder: null
        });
      } else {
        setError(response.data.message || "Une erreur est survenue lors de la déliaison avec Discord.");
      }
    } catch (error: any) {
      console.error('Erreur lors de la déliaison Discord:', error);
      setError(error.response?.data?.message || "Une erreur est survenue lors de la déliaison avec Discord.");
    } finally {
      setIsLoading(false);
    }
  };
  const checkDiscordStatus = async () => {
    if (!isConnected || !account) {
      console.log('Non connecté ou pas de compte:', { isConnected, account });
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = authService.getToken();
      if (!token) {
        console.log('Pas de token trouvé');
        setError("Vous n'êtes pas authentifié. Veuillez vous connecter.");
        setIsLoading(false);
        return;
      }
      console.log('Vérification du statut Discord pour:', { account, token: token.substring(0, 10) + '...' });
      const response = await axios.get<DiscordStatusResponse>(`${DISCORD_API_BASE}/link-status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Réponse du statut Discord:', response.data);
      const newState = {
        linked: response.data.linked || false,
        discordUsername: response.data.discordUsername || null,
        discordAvatar: response.data.discordAvatar || null,
        discordId: response.data.discordId || null,
        notifyDailyClaims: response.data.notifyDailyClaims !== undefined ? response.data.notifyDailyClaims : true,
        isEarlyContributor: response.data.isEarlyContributor || false,
        registrationOrder: response.data.registrationOrder || null
      };
      console.log('Mise à jour de l\'état avec:', newState);
      setDiscordState(newState);
    } catch (error: any) {
      console.error('Erreur lors de la vérification du statut Discord:', error);
      if (error.response?.status === 404) {
        console.log('Utilisateur non lié à Discord');
      } else {
        setError(error.response?.data?.message || "Une erreur est survenue lors de la vérification du statut Discord.");
      }
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
      console.log('useEffect déclenché - Vérification du statut Discord', { isConnected, account });
      checkDiscordStatus();
    }
    checkForDiscordCode();
  }, [isConnected, account]);
  const isGoogleWallet = typeof window !== 'undefined' ? localStorage.getItem('isGoogleWallet') === 'true' : false;
  if (!isConnected) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg text-center">
        <p className="text-gray-400">Veuillez vous connecter pour lier votre compte Discord</p>
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
                src={`https:
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
          <p className="text-gray-400 text-sm mb-4">
            Connectez votre compte Discord pour rejoindre automatiquement notre serveur, recevoir des notifications et des récompenses.
          </p>
          <div className="flex justify-center mb-2">
            <Button 
              onClick={handleDiscordLink}
              className="bg-purple-700 hover:bg-purple-600 w-full max-w-xs"
              disabled={!isConnected || isLoading}
            >
              <Link className="mr-2" />
              {isLoading ? 'Liaison en cours...' : 'Lier mon compte Discord'}
            </Button>
          </div>
          <p className="text-gray-500 text-xs italic text-center">
            En liant votre compte, vous rejoindrez automatiquement notre serveur Discord et pourrez recevoir vos récompenses.
          </p>
        </div>
      )}
    </Card>
  );
}
