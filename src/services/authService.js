// src/services/authService.js
import { API_BASE_URL } from '../config/env';
import axios from 'axios';

const API_URL = API_BASE_URL;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';
const WALLET_ADDRESS_KEY = 'wallet_address';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Fonction pour enregistrer un nouvel utilisateur
export const register = async (username, email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
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
    const response = await axios.post(`${API_URL}/auth/login`, {
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
    const response = await axios.post(`${API_URL}/auth/token`, {
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(WALLET_ADDRESS_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Fonction pour vérifier si l'utilisateur est connecté
export const isAuthenticated = () => {
  return localStorage.getItem(TOKEN_KEY) !== null;
};

// Fonction pour obtenir le token JWT
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
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
    
    const response = await axios.get(`${API_URL}/auth/profile`, {
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
  return localStorage.getItem(WALLET_ADDRESS_KEY);
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
    
    const response = await axios.post(`${API_URL}/auth/token`, {
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

// Fonction pour sauvegarder le token et les informations associées
export const saveToken = (token, expiresAt, walletAddress) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (expiresAt) localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
  if (walletAddress) localStorage.setItem(WALLET_ADDRESS_KEY, walletAddress);
};

// Fonction pour rafraîchir le token si nécessaire
export const refreshTokenIfNeeded = async () => {
  console.log('🔄 Vérification de la nécessité de rafraîchir le token...');
  
  // Vérifier si le token est expiré
  const isExpired = isTokenExpired();
  console.log('📝 Token expiré?', isExpired ? 'Oui' : 'Non');
  
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
    // Récupérer l'adresse du wallet actuel
    const currentWallet = localStorage.getItem(WALLET_ADDRESS_KEY);
    const walletAddressFromLocalStorage = localStorage.getItem('walletAddress');
    
    // Récupérer le token JWT
    const token = getToken();
    
    if (!token) {
      console.log('Aucun token trouvé');
      return false;
    }
    
    // Décoder le token JWT (partie payload)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    // Vérifier si l'adresse du wallet dans le token correspond à l'adresse actuelle
    console.log('Adresse du wallet dans localStorage (wallet_address):', currentWallet);
    console.log('Adresse du wallet dans localStorage (walletAddress):', walletAddressFromLocalStorage);
    console.log('Adresse du wallet dans le token JWT:', payload.walletAddress);
    console.log('Les adresses correspondent (wallet_address):', currentWallet === payload.walletAddress);
    console.log('Les adresses correspondent (walletAddress):', walletAddressFromLocalStorage === payload.walletAddress);
    
    // Vérifier avec les deux clés possibles
    return currentWallet === payload.walletAddress || walletAddressFromLocalStorage === payload.walletAddress;
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    return false;
  }
};

// Fonction pour synchroniser toutes les références à l'adresse du wallet
export const synchronizeWalletAddress = (newWalletAddress) => {
  // Mettre à jour les clés principales
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
  synchronizeWalletAddress
};