"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import axios from 'axios';
import { MessageCircle, LogOut, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { config } from '@/config/env';
import { authService } from '@/services/authService';

// URL de base pour les requêtes Discord
const DISCORD_API_BASE = `${config.API_BASE_URL}/discord`;

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

export default function HeaderDiscordButton() {
  const { isConnected, account } = useWalletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [discordState, setDiscordState] = useState({
    linked: false,
    discordUsername: null as string | null,
    discordAvatar: null as string | null,
    discordId: null as string | null,
    notifyDailyClaims: true,
    isEarlyContributor: false,
    registrationOrder: null as number | null
  });

  const getRedirectUri = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/discord/callback`;
  };

  const setLocalStorageState = (state: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('discordOAuthState', state);
    }
  };

  const generateDiscordAuthUrl = () => {
    const state = Math.random().toString(36).substring(2, 15);
    setLocalStorageState(state);
    const redirectUri = getRedirectUri();
    const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    
    if (!DISCORD_CLIENT_ID) {
      console.warn('[Discord] DISCORD_CLIENT_ID is not defined!');
    }
    
    // Inclure le scope guilds.join pour permettre l'ajout automatique au serveur
    const scopes = ['identify', 'guilds.join'].join('%20');
    
    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}`;
    return url;
  };

  const handleDiscordLink = async () => {
    if (!isConnected || !account) return;
    
    // Si déjà lié, afficher un menu contextuel ou une boîte de dialogue
    if (discordState.linked) {
      // Pour l'instant, on ne fait rien de spécial quand on clique sur le bouton si déjà lié
      // On pourrait ajouter un menu contextuel ici plus tard
      return;
    }
    
    setIsLoading(true);
    
    try {
      const authUrl = generateDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Erreur lors de la génération de l\'URL Discord:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour délier le compte Discord
  const handleDiscordUnlink = async () => {
    if (!isConnected || !account) return;
    
    if (!window.confirm('Êtes-vous sûr de vouloir délier votre compte Discord ?')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const token = authService.getToken();
      if (!token) {
        console.error("Vous n'êtes pas authentifié. Veuillez vous connecter.");
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
        console.error(response.data.message || "Une erreur est survenue lors de la déliaison avec Discord.");
      }
    } catch (error: any) {
      console.error('Erreur lors de la déliaison Discord:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDiscordStatus = async () => {
    if (!isConnected || !account) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const token = authService.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      const response = await axios.get<DiscordStatusResponse>(`${DISCORD_API_BASE}/link-status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Mettre à jour l'état que le compte soit lié ou non
      const newState = {
        linked: response.data.linked || false,
        discordUsername: response.data.discordUsername || null,
        discordAvatar: response.data.discordAvatar || null,
        discordId: response.data.discordId || null,
        notifyDailyClaims: response.data.notifyDailyClaims !== undefined ? response.data.notifyDailyClaims : true,
        isEarlyContributor: response.data.isEarlyContributor || false,
        registrationOrder: response.data.registrationOrder || null
      };
      
      setDiscordState(newState);
    } catch (error: any) {
      console.error('Erreur lors de la vérification du statut Discord:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effet pour vérifier le statut Discord
  useEffect(() => {
    if (isConnected && account) {
      checkDiscordStatus();
    }
  }, [isConnected, account]);
  
  // Effet pour fermer le menu lorsqu'on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fonction pour générer l'URL de l'avatar Discord
  const getDiscordAvatarUrl = () => {
    if (!discordState.discordId || !discordState.discordAvatar) return null;
    return `https://cdn.discordapp.com/avatars/${discordState.discordId}/${discordState.discordAvatar}.png?size=32`;
  };

  if (!isConnected) return null;

  // Générer l'URL de l'avatar
  const avatarUrl = getDiscordAvatarUrl();

  return (
    <div className="relative inline-block" ref={menuRef}>
      {discordState.linked ? (
        <>
          <Button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={isLoading}
            className="px-4 py-2 h-auto text-sm flex items-center gap-3 min-w-[140px] bg-opacity-30 backdrop-blur-md bg-purple-900 hover:bg-purple-800 hover:bg-opacity-40 border border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-300 ease-in-out"
            title={`Connecté en tant que ${discordState.discordUsername}`}
          >
            {isLoading ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Discord Avatar" 
                    className="w-7 h-7 rounded-full border border-purple-300/30"
                  />
                ) : (
                  <MessageCircle size={20} className="text-purple-300" />
                )}
                <span className="max-w-[100px] truncate">{discordState.discordUsername}</span>
                {discordState.isEarlyContributor && (
                  <span className="bg-yellow-500/20 text-yellow-300 text-[10px] px-1 py-0.5 rounded-sm">★</span>
                )}
              </>
            )}
          </Button>
          
          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-md shadow-[0_0_15px_rgba(255,255,255,0.2)] bg-gray-900/70 backdrop-blur-md border border-white/20 text-white z-50 overflow-hidden transition-all duration-300 ease-in-out animate-in fade-in-50 slide-in-from-top-5">
              <div className="px-4 py-3 font-medium border-b border-white/10 text-white/90">Mon compte Discord</div>
              
              <div 
                className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-purple-900/30 transition-colors duration-200"
                onClick={() => {
                  window.open('https://discord.gg/windprotocol', '_blank');
                  setMenuOpen(false);
                }}
              >
                <ExternalLink size={16} className="text-purple-300" />
                <span>Ouvrir Discord</span>
              </div>
              
              <div 
                className="flex items-center gap-2 px-4 py-3 cursor-pointer text-red-300 hover:bg-red-900/20 hover:text-red-200 transition-colors duration-200"
                onClick={() => {
                  handleDiscordUnlink();
                  setMenuOpen(false);
                }}
              >
                <LogOut size={16} />
                <span>Délier mon compte</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <Button
          onClick={handleDiscordLink}
          disabled={isLoading}
          className="px-4 py-2 h-auto text-sm flex items-center gap-3 min-w-[140px] bg-opacity-30 backdrop-blur-md bg-gray-800 hover:bg-gray-700 hover:bg-opacity-40 border border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all duration-300 ease-in-out"
          title="Lier mon compte Discord"
        >
          {isLoading ? (
            <span className="animate-pulse">...</span>
          ) : (
            <>
              <MessageCircle size={20} />
              <span>Discord</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
