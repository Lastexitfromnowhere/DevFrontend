import { useState, useEffect } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';

export function useAuth() {
  const { isConnected, account } = useWalletContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isConnected || !account) {
        setIsAuthenticated(false);
        setAuthError('Wallet not connected');
        return;
      }

      try {
        // Vérifier si nous avons une adresse valide
        const storedAddress = localStorage.getItem('wallet_address');
        if (storedAddress !== account) {
          localStorage.setItem('wallet_address', account);
        }
        
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (error) {
        console.error('Authentication error:', error);
        setIsAuthenticated(false);
        setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      }
    };

    checkAuth();
  }, [isConnected, account]);

  return {
    isAuthenticated,
    authError,
  };
}

export default useAuth;
