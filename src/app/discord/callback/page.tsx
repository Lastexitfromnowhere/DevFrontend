"use client";
import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { DashboardButton } from '@/components/ui/DashboardButton';
import { Spinner } from '@/components/ui/Spinner';
import { Check, X, Award, AlertTriangle, Home } from 'lucide-react';
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
      
      interface DiscordStatusResponse {
        linked: boolean;
        isEarlyContributor?: boolean;
        // Ajoute d'autres champs si besoin
      }
      const response = await axios.get<DiscordStatusResponse>(`${DISCORD_API_BASE}/link-status`, {
        headers
      });
      
      console.log('Discord link-status response:', response);
      
      if (response.data.linked) {
        setStatus('success');
        setMessage('Votre compte Discord a été lié avec succès !');
        setIsEarlyContributor(response.data.isEarlyContributor || false);
      } else {
        setStatus('error');
        setMessage('Votre compte Discord n\'est pas lié à ce wallet.');
      }
    } catch (error: any) {
      console.error('Error checking Discord status:', error);
      setStatus('error');
      setMessage('Une erreur est survenue lors de la vérification du statut Discord.');
    }
  }, [checkEarlyContributor]);

  // Fonction pour compléter la liaison Discord directement depuis le frontend
  const completeDiscordLink = useCallback(async (code: string) => {
    try {
      setStatus('loading');
      setMessage('Liaison de votre compte Discord en cours...');
      
      // Vérifier que le token est valide et le rafraîchir si nécessaire
      await authService.refreshTokenIfNeeded();
      
      // Obtenir les en-têtes d'authentification
      const headers = await authService.getAuthHeaders();
      
      // Définir l'interface pour la réponse de l'API
      interface DiscordCompleteLinkResponse {
        success: boolean;
        message?: string;
        isEarlyContributor?: boolean;
      }

      // Appeler l'API pour compléter la liaison avec le code
      const response = await axios.post<DiscordCompleteLinkResponse>(`${DISCORD_API_BASE}/complete-link`, {
        code
      }, {
        headers
      });
      
      console.log('Discord complete-link response:', response);
      
      if (response.data.success) {
        setStatus('success');
        setMessage('Votre compte Discord a été lié avec succès !');
        setIsEarlyContributor(response.data.isEarlyContributor || false);
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Erreur lors de la liaison de votre compte Discord.');
      }
    } catch (error: any) {
      console.error('Error completing Discord link:', error);
      setStatus('error');
      setMessage('Une erreur est survenue lors de la liaison de votre compte Discord.');
    }
  }, []);

  useEffect(() => {
    const code = searchParams?.get('code') || null;
    const error = searchParams?.get('error') || null;
    const noToken = searchParams?.get('noToken') || null;
    
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
    
    // Si noToken=true, cela signifie que le backend n'a pas pu extraire le walletAddress
    // et nous a redirigé vers le frontend pour compléter la liaison
    if (noToken === 'true') {
      console.log('Redirection depuis le backend sans token, tentative de liaison directe');
      completeDiscordLink(code);
    } else {
      // Le code est présent, le backend va s'occuper de traiter ce code
      // Nous devons juste vérifier si la liaison a réussi
      checkDiscordStatus();
    }
  }, [searchParams, checkDiscordStatus, completeDiscordLink]);

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
            <Spinner size="lg" />
          ) : status === 'success' ? (
            <>
              <Check className="mx-auto mb-2 h-12 w-12 text-green-500" />
              <h2 className="text-xl font-semibold text-white">Succès</h2>
              <p className="text-gray-400">{message}</p>
              {isEarlyContributor && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Award className="h-6 w-6 text-yellow-500" />
                  <span className="text-yellow-400 font-medium">Early Contributor</span>
                </div>
              )}
              <DashboardButton 
                className="mt-6"
                onClick={() => router.push('/')}
                icon={<Home className="h-4 w-4" />}
              >
                Retour à Last Exit
              </DashboardButton>
            </>
          ) : (
            <>
              <X className="mx-auto mb-2 h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold text-red-500">Erreur</h2>
              <p className="text-gray-400">{message || "Une erreur inconnue est survenue."}</p>
              <p className="text-xs text-red-400 mt-2">Si le problème persiste, vérifiez votre connexion ou contactez le support. (Le serveur Discord ou le backend est peut-être inaccessible)</p>
              <DashboardButton 
                className="mt-6"
                onClick={() => router.push('/')}
                icon={<Home className="h-4 w-4" />}
              >
                Retour à Last Exit
              </DashboardButton>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
