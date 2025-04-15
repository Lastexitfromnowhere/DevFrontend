import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { DashboardButton } from '@/components/ui/DashboardButton';
import { Spinner } from '@/components/ui/Spinner';
import { Check, X, Award, AlertTriangle } from 'lucide-react';
import { config } from '@/config/env';
import axios from 'axios';
import { authService } from '@/services/authService';

// URL de base pour les requêtes Discord
const DISCORD_API_BASE = `${config.API_BASE_URL}/discord`;

// Interface pour la réponse de l'API
interface DiscordResponse {
  success: boolean;
  linked: boolean;
  message?: string;
}

interface EarlyContributorResponse {
  success: boolean;
  isEarlyContributor: boolean;
}

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

  // Fonction pour vérifier le statut early contributor
  const checkEarlyContributor = useCallback(async (headers: any) => {
    try {
      const response = await axios.get<EarlyContributorResponse>(`${DISCORD_API_BASE}/early-contributor`, {
        headers
      });
      
      setIsEarlyContributor(response.data.isEarlyContributor);
    } catch (error) {
      console.error('Error checking early contributor status:', error);
      setIsEarlyContributor(false);
    }
  }, []);

  // Fonction pour vérifier le statut de liaison Discord
  const checkDiscordStatus = useCallback(async () => {
    try {
      // Vérifier que le token est valide et le rafraîchir si nécessaire
      await authService.refreshTokenIfNeeded();
      
      // Obtenir les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      // Attendre un peu pour laisser le temps au backend de traiter la liaison
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await axios.get<DiscordResponse>(`${DISCORD_API_BASE}/status`, {
        headers
      });
      
      console.log('Discord status response:', response);
      
      if (response.data.success && response.data.linked) {
        setStatus('success');
        setMessage('Votre compte Discord a été lié avec succès !');
        
        // Vérifier si l'utilisateur est un early contributor
        await checkEarlyContributor(headers);
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Erreur lors de la liaison avec Discord. Veuillez réessayer.');
      }
    } catch (error: any) {
      console.error('Error checking Discord status:', error);
      setStatus('error');
      setMessage('Une erreur est survenue lors de la vérification du statut Discord.');
    }
  }, [checkEarlyContributor]);

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
  }, [searchParams, checkDiscordStatus]);

  // Redirection à la page d'accueil après un délai
  const redirectToHome = useCallback(() => {
    setTimeout(() => {
      router.push('/');
    }, 5000); // 5 secondes de délai
  }, [router]);

  // Afficher le résultat
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black to-gray-900 p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          {status === 'loading' ? (
            <>
              <Spinner size="lg" />
              <h2 className="text-xl font-semibold text-white">Chargement...</h2>
              <p className="text-gray-400">Vérification de la liaison Discord en cours</p>
            </>
          ) : status === 'success' ? (
            <>
              <Check className="w-16 h-16 text-green-500" />
              <h2 className="text-xl font-semibold text-white">{message}</h2>
              {isEarlyContributor && (
                <div className="flex items-center space-x-2 text-yellow-500">
                  <Award className="w-5 h-5" />
                  <span>Early Contributor Status Activé !</span>
                </div>
              )}
              <DashboardButton />
            </>
          ) : (
            <>
              <AlertTriangle className="w-16 h-16 text-red-500" />
              <h2 className="text-xl font-semibold text-white">Erreur</h2>
              <p className="text-gray-400">{message}</p>
              <DashboardButton />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
