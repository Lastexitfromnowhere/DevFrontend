import { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { authService } from '@/services/authService';

export function useAuth() {
  const { isConnected, account } = useWalletContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      
      try {
        if (!isConnected || !account) {
          setIsAuthenticated(false);
          setAuthError('Wallet not connected');
          setIsLoading(false);
          return;
        }

        // Vérifier si nous avons une adresse valide
        const storedAddress = authService.getWalletAddress();
        if (storedAddress !== account) {
          // Générer un nouveau token pour la nouvelle adresse
          const { token, expiresAt } = await authService.generateToken(account);
          authService.saveToken(token, expiresAt, account);
        } else if (authService.isTokenExpired()) {
          // Rafraîchir le token s'il est expiré
          await authService.refreshTokenIfNeeded();
        }
        
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (error) {
        console.error('Authentication error:', error);
        setIsAuthenticated(false);
        setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isConnected, account]);

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    authError,
    isLoading,
    logout
  };
}

export default useAuth;
