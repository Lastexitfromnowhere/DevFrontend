"use client";

import React, { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import axios from 'axios';
import { Discord } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DISCORD_API_BASE } from '@/utils/constants';
import authService from '@/services/authService';

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

  useEffect(() => {
    if (isConnected && account) {
      checkDiscordStatus();
    }
  }, [isConnected, account]);

  if (!isConnected) return null;

  return (
    <Button
      onClick={handleDiscordLink}
      disabled={isLoading}
      className={`px-3 py-1 h-auto text-xs flex items-center ${
        discordState.linked 
          ? 'bg-purple-700 hover:bg-purple-600' 
          : 'bg-gray-700 hover:bg-gray-600'
      }`}
      title={discordState.linked ? `Connecté en tant que ${discordState.discordUsername}` : 'Lier mon compte Discord'}
    >
      <Discord size={16} className="mr-1" />
      {discordState.linked ? (
        <span className="max-w-[100px] truncate">{discordState.discordUsername}</span>
      ) : (
        'Discord'
      )}
    </Button>
  );
}
