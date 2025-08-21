// src/services/authService.js
import axios from 'axios';

// Utiliser des chemins relatifs pour que le proxy Next.js intercepte les requêtes
const API_URL = '';
const TOKEN_KEY = 'jwt_token'; // Unifié avec le reste de l'app
const USER_KEY = 'user_info';
const WALLET_ADDRESS_KEY = 'wallet_address'; // Clé principale unifiée
const TOKEN_EXPIRY_KEY = 'token_expires_at'; // Unifié avec le reste de l'app

// Fonction pour détecter l'origine actuelle
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://wind-frontend-rosy.vercel.app'; // Valeur par défaut
};

// Déterminer l'origine à utiliser pour les en-têtes
const getOriginForHeaders = () => {
  const currentOrigin = getCurrentOrigin();
  // Si l'origine actuelle est lastparadox.xyz, utiliser wind-frontend-rosy.vercel.app comme origine pour l'API
  if (currentOrigin.includes('lastparadox.xyz')) {
    return 'https://wind-frontend-rosy.vercel.app';
  }
  return currentOrigin;
};

// Créer une instance axios avec des en-têtes spécifiques pour contourner CORS
const api = axios.create();

// Ajouter un intercepteur pour ajouter les en-têtes à chaque requête
api.interceptors.request.use(config => {
  const originForHeaders = getOriginForHeaders();
  config.headers = {
    ...config.headers,
    'Origin': originForHeaders,
    'X-Forwarded-Host': new URL(originForHeaders).host
  };
  return config;
});

// Fonction pour enregistrer un nouvel utilisateur
export const register = async (username, email, password) => {
  try {
    const response = await axios.post(`/auth/register`, {
      username,
      email,
      password
    });
    
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.error('Erreur d\'enregistrement:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de l\'enregistrement'
    };
  }
};

// Fonction pour connecter un utilisateur avec username/password
export const login = async (username, password) => {
  try {
    const response = await axios.post(`/auth/login`, {
      username,
      password
    });
    
    if (response.data.success && response.data.token) {
      // Stocker le token et les infos utilisateur
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      
      return {
        success: true,
        user: response.data.user
      };
    }
    
    return {
      success: false,
      message: 'Authentification échouée'
    };
  } catch (error) {
    console.error('Erreur de connexion:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la connexion'
    };
  }
};

// Fonction pour connecter avec une adresse de wallet (conserver pour compatibilité)
export const connectWithWallet = async (walletAddress) => {
  try {
    const response = await axios.post(`/auth/token`, {
      walletAddress
    });
    
    if (response.data.success && response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify({ walletAddress }));
      
      return {
        success: true,
        walletAddress
      };
    }
    
    return {
      success: false,
      message: 'Authentification échouée'
    };
  } catch (error) {
    console.error('Erreur de connexion avec wallet:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la connexion avec wallet'
    };
  }
};

// Fonction pour déconnecter l'utilisateur
export const logout = () => {
  // Nettoyer toutes les clés d'authentification
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('auth_token'); // Ancienne clé
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(WALLET_ADDRESS_KEY);
  localStorage.removeItem('walletAddress'); // Clé alternative
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem('token_expiry'); // Ancienne clé
  localStorage.removeItem('isGoogleWallet');
  localStorage.removeItem('isAuthReady');
  localStorage.removeItem('isConnected');
  localStorage.removeItem('google_user_id');
  localStorage.removeItem('google_user_email');
  localStorage.removeItem('google_user_name');
};

// Fonction pour vérifier si l'utilisateur est connecté
export const isAuthenticated = () => {
  return localStorage.getItem(TOKEN_KEY) !== null;
};

// Fonction pour obtenir le token JWT
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('auth_token');
};

// Fonction pour obtenir les informations de l'utilisateur
export const getUserInfo = () => {
  const userInfo = localStorage.getItem(USER_KEY);
  return userInfo ? JSON.parse(userInfo) : null;
};

// Fonction pour obtenir le profil utilisateur depuis l'API
export const getUserProfile = async () => {
  try {
    const token = getToken();
    if (!token) {
      return {
        success: false,
        message: 'Non authentifié'
      };
    }
    
    const response = await axios.get(`/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return {
      success: true,
      user: response.data.user
    };
  } catch (error) {
    console.error('Erreur de récupération du profil:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la récupération du profil'
    };
  }
};

// Fonction pour configurer les en-têtes d'authentification pour les requêtes API
export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fonction pour configurer les en-têtes d'authentification pour les requêtes API (version plurielle)
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fonction pour vérifier si le token est expiré
export const isTokenExpired = () => {
  const token = getToken();
  if (!token) return true;
  
  try {
    // Décoder le token JWT (partie payload)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    // Vérifier l'expiration
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    return true;
  }
};

// Fonction pour obtenir l'adresse du wallet stockée
export const getWalletAddress = () => {
  return localStorage.getItem(WALLET_ADDRESS_KEY) || localStorage.getItem('walletAddress');
};

// Fonction pour obtenir l'adresse du wallet directement depuis le token JWT
export const getWalletAddressFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    // Décoder le token JWT (partie payload)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    // Retourner l'adresse du wallet depuis le payload
    return payload.walletAddress || null;
  } catch (error) {
    console.error('Erreur lors de l\'extraction de l\'adresse du wallet depuis le token:', error);
    return null;
  }
};

// Fonction pour générer un token avec une adresse de wallet
export const generateToken = async (walletAddress) => {
  try {
    console.log('🔍 Tentative de génération de token pour:', walletAddress);
    
    if (!walletAddress) {
      console.error('❌ Erreur: Adresse de wallet non fournie pour la génération du token');
      throw new Error('Adresse de wallet requise');
    }
    
    const response = await axios.post(`/auth/token`, {
      walletAddress
    });
    
    console.log('📝 Réponse du serveur pour la génération de token:', {
      status: response.status,
      success: response.data?.success,
      hasToken: !!response.data?.token,
      expiresAt: response.data?.expiresAt
    });
    
    if (response.data.success && response.data.token) {
      return {
        token: response.data.token,
        expiresAt: response.data.expiresAt || null
      };
    }
    
    console.error('❌ Échec de génération du token:', response.data);
    throw new Error(response.data.message || 'Échec de génération du token');
  } catch (error) {
    console.error('❌ Erreur lors de la génération du token:', error);
    console.error('Détails:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

// Fonction pour rafraîchir le token si nécessaire
const refreshTokenIfNeeded = async () => {
  const isExpired = isTokenExpired();
  
  if (isExpired) {
    console.log('🔄 Token expiré, tentative de rafraîchissement...');
    const walletAddress = getWalletAddress();
    console.log('📝 Adresse du wallet récupérée:', walletAddress || 'Non disponible');
    
    if (walletAddress) {
      try {
        console.log('🔄 Génération d\'un nouveau token pour', walletAddress);
        const { token, expiresAt } = await generateToken(walletAddress);
        
        if (!token) {
          console.error('❌ Erreur: Token non généré');
          return false;
        }
        
        console.log('✅ Nouveau token généré, sauvegarde en cours...');
        saveToken(token, expiresAt, walletAddress);
        console.log('✅ Token rafraîcht avec succès!');
        return true;
      } catch (error) {
        console.error('❌ Erreur lors du rafraîchissement du token:', error);
        console.error('Détails:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        // Si l'erreur est due à une authentification invalide, nettoyer le localStorage
        if (error.response?.status === 401) {
          console.warn('⚠️ Erreur d\'authentification 401, nettoyage du localStorage...');
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(WALLET_ADDRESS_KEY);
          localStorage.removeItem(TOKEN_EXPIRY_KEY);
        }
        
        return false;
      }
    } else {
      console.error('❌ Impossible de rafraîchir le token: adresse de wallet non disponible');
      return false;
    }
  }
  
  console.log('✅ Token valide, pas besoin de rafraîchissement');
  return true;
};

// Fonction pour vérifier si le token JWT correspond à l'adresse du wallet
export const verifyTokenWalletMatch = () => {
  try {
    // Récupérer l'adresse du wallet actuel (essayer les deux clés)
    const currentWallet = localStorage.getItem(WALLET_ADDRESS_KEY) || localStorage.getItem('walletAddress');
    
    // Récupérer le token JWT
    const token = getToken();
    
    if (!token) {
      console.log('Aucun token trouvé');
      return false;
    }
    
    if (!currentWallet) {
      console.log('Aucune adresse de wallet trouvée');
      return false;
    }
    
    // Décoder le token JWT (partie payload)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    // Vérifier si l'adresse du wallet dans le token correspond à l'adresse actuelle
    console.log('Adresse du wallet dans localStorage:', currentWallet);
    console.log('Adresse du wallet dans le token JWT:', payload.walletAddress);
    
    const isMatch = currentWallet === payload.walletAddress;
    console.log('Les adresses correspondent:', isMatch);
    
    return isMatch;
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    return false;
  }
};

// Fonction pour sauvegarder le token
export const saveToken = (token, expiresAt, walletAddress) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt);
    }
    if (walletAddress) {
      // Synchroniser les deux clés pour éviter les incohérences
      localStorage.setItem(WALLET_ADDRESS_KEY, walletAddress);
      localStorage.setItem('walletAddress', walletAddress);
    }
  }
};

// Fonction pour sauvegarder une association Google-Wallet
export const saveGoogleWalletAssociation = async (googleUserId, userEmail, userName, walletAddress) => {
  try {
    const response = await fetch('/auth/google-wallet-association', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleUserId,
        userEmail,
        userName,
        walletAddress
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'association Google-Wallet:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour récupérer une association Google-Wallet
export const getGoogleWalletAssociation = async (googleUserId) => {
  try {
    const response = await fetch(`/auth/google-wallet-association/${googleUserId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'association Google-Wallet:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour synchroniser toutes les références à l'adresse du wallet
export const synchronizeWalletAddress = (newWalletAddress) => {
  if (!newWalletAddress) {
    console.warn('Tentative de synchronisation avec une adresse vide');
    return;
  }
  
  // Mettre à jour les clés principales de manière synchronisée
  localStorage.setItem(WALLET_ADDRESS_KEY, newWalletAddress);
  localStorage.setItem('walletAddress', newWalletAddress);
  
  // Mettre à jour l'adresse dans vpnNodeStatus
  try {
    const vpnNodeStatus = JSON.parse(localStorage.getItem('vpnNodeStatus') || '{}');
    vpnNodeStatus.walletAddress = newWalletAddress;
    localStorage.setItem('vpnNodeStatus', JSON.stringify(vpnNodeStatus));
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut du nœud VPN:', error);
  }
  
  console.log('Adresse de wallet synchronisée:', newWalletAddress);
};

// Fonction pour vérifier l'état d'authentification complet
export const checkAuthenticationState = () => {
  const token = getToken();
  const walletAddress = getWalletAddress();
  const tokenExpiresAt = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const isGoogleWallet = localStorage.getItem('isGoogleWallet') === 'true';
  
  // Vérifier si le token existe et n'est pas expiré
  let isTokenValid = false;
  if (token && tokenExpiresAt) {
    const expirationTime = parseInt(tokenExpiresAt);
    const currentTime = Date.now();
    isTokenValid = currentTime < expirationTime;
    
    if (!isTokenValid) {
      console.log('Token JWT expiré, nettoyage automatique');
      logout(); // Nettoyer complètement
    }
  }
  
  // Vérifier la correspondance token/wallet
  const tokenWalletMatch = token && walletAddress ? verifyTokenWalletMatch() : false;
  
  const authState = {
    hasToken: !!token,
    hasWalletAddress: !!walletAddress,
    isTokenValid,
    tokenWalletMatch,
    isGoogleWallet,
    isAuthenticated: isTokenValid && tokenWalletMatch,
    reason: !isTokenValid && token ? 'token_expired' : null
  };
  
  console.log('État d\'authentification:', authState);
  
  return authState;
};

// Créer et exporter un objet authService pour la compatibilité
export const authService = {
  register,
  login,
  connectWithWallet,
  logout,
  isAuthenticated,
  getToken,
  getUserInfo,
  getUserProfile,
  getAuthHeader,
  getAuthHeaders,
  isTokenExpired,
  getWalletAddress,
  getWalletAddressFromToken,
  generateToken,
  saveToken,
  refreshTokenIfNeeded,
  verifyTokenWalletMatch,
  synchronizeWalletAddress,
  saveGoogleWalletAssociation,
  getGoogleWalletAssociation,
  checkAuthenticationState,

  // Créer ou mettre à jour un utilisateur Solana
  createOrUpdateSolanaUser: async (walletAddress, publicKey, userType = 'direct', additionalData = {}) => {
    try {
      const response = await fetch(`${API_URL}/auth/solana-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          publicKey,
          userType,
          ...additionalData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Utilisateur Solana créé/mis à jour:', data.data);
        return {
          success: true,
          data: data.data,
          message: data.message
        };
      } else {
        console.error('Erreur lors de la création de l\'utilisateur Solana:', data.message);
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur Solana:', error);
      return { success: false, error: error.message };
    }
  },

  // Récupérer un utilisateur Solana
  getSolanaUser: async (walletAddress) => {
    try {
      const response = await fetch(`${API_URL}/auth/solana-user/${walletAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          success: true,
          data: data.data
        };
      } else {
        return { success: false, message: data.message || 'Utilisateur non trouvé' };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur Solana:', error);
      return { success: false, error: error.message };
    }
  },

  // Mettre à jour les préférences utilisateur
  updateSolanaUserPreferences: async (walletAddress, preferences) => {
    try {
      const response = await fetch(`${API_URL}/auth/solana-user/${walletAddress}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          data: data.data,
          message: data.message
        };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      return { success: false, error: error.message };
    }
  },

  // Synchroniser les rewards avec les données existantes
  syncSolanaUserRewards: async (walletAddress, rewardsData) => {
    try {
      const response = await fetch(`${API_URL}/auth/solana-user/${walletAddress}/sync-rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardsData)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Rewards synchronisés:', data.data);
        return {
          success: true,
          data: data.data,
          message: data.message
        };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation des rewards:', error);
      return { success: false, error: error.message };
    }
  },

  // Méthode helper pour créer un utilisateur Google-Wallet complet
  createGoogleWalletUser: async (googleUserData, walletAddress, publicKey) => {
    try {
      // 1. Sauvegarder l'association Google-Wallet
      const googleWalletResult = await authService.saveGoogleWalletAssociation(
        googleUserData.sub,
        googleUserData.email,
        googleUserData.name,
        walletAddress
      );

      if (!googleWalletResult.success) {
        console.warn('Échec de la sauvegarde Google-Wallet, continuation...');
      }

      // 2. Créer l'utilisateur Solana avec type 'google'
      const solanaUserResult = await authService.createOrUpdateSolanaUser(
        walletAddress,
        publicKey,
        'google',
        {
          googleUserId: googleUserData.sub,
          email: googleUserData.email,
          name: googleUserData.name
        }
      );

      return {
        success: solanaUserResult.success,
        data: {
          googleWallet: googleWalletResult,
          solanaUser: solanaUserResult
        },
        message: solanaUserResult.success 
          ? 'Utilisateur Google-Wallet créé avec succès'
          : solanaUserResult.message
      };
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur Google-Wallet:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  // Méthode helper pour créer un utilisateur wallet direct
  createDirectWalletUser: async (walletAddress, publicKey) => {
    try {
      const result = await authService.createOrUpdateSolanaUser(
        walletAddress,
        publicKey,
        'direct'
      );

      return result;
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur wallet direct:', error);
      return { success: false, error: error.message };
    }
  },

  // Méthode pour migrer les rewards existants d'un utilisateur
  migrateUserRewards: async (walletAddress, existingRewardsData) => {
    try {
      // Récupérer l'utilisateur Solana
      const userResult = await authService.getSolanaUser(walletAddress);
      
      if (!userResult.success) {
        console.warn('Utilisateur Solana non trouvé, création...');
        // Si l'utilisateur n'existe pas, le créer d'abord
        const createResult = await authService.createDirectWalletUser(walletAddress, walletAddress);
        if (!createResult.success) {
          return { success: false, message: 'Impossible de créer l\'utilisateur pour la migration' };
        }
      }

      // Synchroniser les rewards
      const syncResult = await authService.syncSolanaUserRewards(walletAddress, {
        totalRewardsClaimed: existingRewardsData.totalRewards || 0,
        consecutiveDays: existingRewardsData.consecutiveDays || 0,
        lastClaimDate: existingRewardsData.lastClaimDate || null
      });

      return syncResult;
    } catch (error) {
      console.error('Erreur lors de la migration des rewards:', error);
      return { success: false, error: error.message };
    }
  }
};