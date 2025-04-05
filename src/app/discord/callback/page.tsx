'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { DashboardButton } from '@/components/ui/DashboardButton';
import { Spinner } from '@/components/ui/Spinner';
import { Check, X, Award, AlertTriangle } from 'lucide-react';
import { config } from '@/config/env';
import axios from 'axios';
import { authService } from '@/services/authService';

// URL de base pour les requêtes Discord
const DISCORD_API_BASE = `${config.API_BASE_URL}/api/discord`;

// Composant principal avec Suspense
export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DiscordCallbackContent />
    </Suspense>
  );
}

// Composant de chargement
function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black to-gray-900 p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <h2 className="text-xl font-semibold text-white">Chargement...</h2>
          <p className="text-gray-400">Vérification de la liaison Discord en cours</p>
        </div>
      </Card>
    </div>
  );
}

// Composant client avec la logique
function DiscordCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [isEarlyContributor, setIsEarlyContributor] = useState<boolean>(false);

  useEffect(() => {
    const code = searchParams?.get('code') || null;
    const error = searchParams?.get('error') || null;
    
    if (error) {
      setStatus('error');
      setMessage('Erreur lors de la connexion à Discord. Veuillez réessayer.');
      return;
    }
    
    if (!code) {
      setStatus('error');
      setMessage('Code d\'autorisation manquant. Veuillez réessayer.');
      return;
    }
    
    // Le code est présent, le backend va s'occuper de traiter ce code
    // Nous devons juste vérifier si la liaison a réussi
    checkDiscordStatus();
  }, [searchParams]);

  // Fonction pour vérifier le statut de liaison Discord
  const checkDiscordStatus = async () => {
    try {
      // Vérifier que le token est valide et le rafraîchir si nécessaire
      await authService.refreshTokenIfNeeded();
      
      // Obtenir les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      // Attendre un peu pour laisser le temps au backend de traiter la liaison
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await axios.get(`${DISCORD_API_BASE}/status`, {
        headers
      });
      
      console.log('Discord status response:', response);
      
      const responseData = response.data as any;
      
      if (responseData.success && responseData.linked) {
        setStatus('success');
        setMessage('Votre compte Discord a été lié avec succès !');
        
        // Vérifier si l'utilisateur est un early contributor
        checkEarlyContributor(headers);
      } else {
        setStatus('error');
        setMessage(responseData.message || 'Erreur lors de la liaison avec Discord. Veuillez réessayer.');
      }
    } catch (error: any) {
      console.error('Error checking Discord status:', error);
      setStatus('error');
      setMessage(error.message || 'Erreur lors de la vérification du statut Discord.');
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
      
      if (responseData.success && responseData.isEarlyContributor) {
        setIsEarlyContributor(true);
      }
    } catch (error: any) {
      console.error('Error checking early contributor status:', error);
    }
  };

  // Fonction pour retourner au tableau de bord
  const handleBackToDashboard = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-gray-900 p-4">
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-8 rounded-lg shadow-lg max-w-md w-full">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Spinner size="lg" />
            <p className="text-gray-300">Liaison de votre compte Discord en cours...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            <div className="p-4 rounded-full bg-red-500/20">
              <X className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center">Échec de la liaison</h2>
            <p className="text-gray-300 text-center">{message}</p>
            <DashboardButton
              onClick={handleBackToDashboard}
              color="gray"
              className="mt-4"
            >
              Retour au tableau de bord
            </DashboardButton>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            <div className="p-4 rounded-full bg-green-500/20">
              <Check className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center">Liaison réussie !</h2>
            <p className="text-gray-300 text-center">{message}</p>
            
            {isEarlyContributor && (
              <div className="flex items-center space-x-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 p-4 rounded-lg mt-4 w-full">
                <Award className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Early Contributor</p>
                  <p className="text-gray-300 text-sm">Félicitations ! Vous faites partie des 5000 premiers contributeurs !</p>
                </div>
              </div>
            )}
            
            <DashboardButton
              onClick={handleBackToDashboard}
              color="green"
              className="mt-4"
            >
              Retour au tableau de bord
            </DashboardButton>
          </div>
        )}
      </Card>
    </div>
  );
}
