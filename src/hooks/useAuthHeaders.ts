'use client';

import { useEffect } from 'react';

/**
 * Hook pour synchroniser l'état d'authentification avec les headers HTTP
 * Nécessaire pour que le middleware puisse détecter l'authentification côté client
 */
export function useAuthHeaders() {
  useEffect(() => {
    const updateAuthHeaders = () => {
      if (typeof window === 'undefined') return;

      const jwtToken = localStorage.getItem('jwt_token');
      const isGoogleWallet = localStorage.getItem('isGoogleWallet') === 'true';
      
      // Créer des headers personnalisés pour informer le middleware
      const headers: Record<string, string> = {};
      
      if (jwtToken) {
        headers['x-has-token'] = 'true';
      }
      
      if (isGoogleWallet) {
        headers['x-google-wallet'] = 'true';
      }
      
      // Stocker les headers dans un meta tag pour que le middleware puisse les lire
      // (Alternative: utiliser des cookies, mais cela nécessite plus de configuration)
      Object.entries(headers).forEach(([key, value]) => {
        let meta = document.querySelector(`meta[name="${key}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = key;
          document.head.appendChild(meta);
        }
        meta.content = value;
      });
    };

    // Mettre à jour immédiatement
    updateAuthHeaders();
    
    // Écouter les changements dans le localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jwt_token' || e.key === 'isGoogleWallet') {
        updateAuthHeaders();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Vérifier périodiquement (au cas où le localStorage change sans événement)
    const interval = setInterval(updateAuthHeaders, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
}
