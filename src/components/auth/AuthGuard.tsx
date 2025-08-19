'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletContext } from '@/contexts/WalletContext';
import { CircularProgress, Box, Typography } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isConnected, isAuthReady } = useWalletContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthentication = () => {
      // Vérifier les différentes méthodes d'authentification
      const hasJwtToken = typeof window !== 'undefined' && localStorage.getItem('jwt_token');
      const isGoogleWallet = typeof window !== 'undefined' && localStorage.getItem('isGoogleWallet') === 'true';
      
      // L'utilisateur est authentifié si :
      // 1. Il est connecté via wallet ET authentifié
      // 2. Il a un token JWT valide
      // 3. Il est connecté via Google
      const authenticated = (isConnected && isAuthReady) || !!hasJwtToken || isGoogleWallet;
      
      if (authenticated) {
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        // Rediriger vers login si pas authentifié
        const currentPath = window.location.pathname;
        const loginUrl = currentPath !== '/' ? `/login?returnUrl=${encodeURIComponent(currentPath)}` : '/login';
        router.push(loginUrl);
      }
    };

    // Délai court pour permettre l'initialisation des contextes
    const timer = setTimeout(checkAuthentication, 100);
    
    return () => clearTimeout(timer);
  }, [isConnected, isAuthReady, router]);

  // Composant de chargement par défaut
  const defaultFallback = (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="100vh"
      bgcolor="black"
      color="white"
    >
      <CircularProgress size={40} sx={{ color: '#00c3ff', mb: 2 }} />
      <Typography variant="body1" color="rgba(255, 255, 255, 0.7)">
        Vérification de l'authentification...
      </Typography>
    </Box>
  );

  if (isLoading) {
    return fallback || defaultFallback;
  }

  if (!isAuthenticated) {
    return fallback || defaultFallback;
  }

  return <>{children}</>;
}
