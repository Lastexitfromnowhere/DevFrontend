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

// Fonction pour générer un token avec une adresse de wallet
export const generateToken = async (walletAddress) => {
  try {
    const response = await axios.post(`${API_URL}/auth/token`, {
      walletAddress
    });
    
    if (response.data.success && response.data.token) {
      return {
        token: response.data.token,
        expiresAt: response.data.expiresAt || null
      };
    }
    
    throw new Error('Échec de génération du token');
  } catch (error) {
    console.error('Erreur lors de la génération du token:', error);
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
  if (isTokenExpired()) {
    const walletAddress = getWalletAddress();
    if (walletAddress) {
      try {
        const { token, expiresAt } = await generateToken(walletAddress);
        saveToken(token, expiresAt, walletAddress);
        return true;
      } catch (error) {
        console.error('Erreur lors du rafraîchissement du token:', error);
        return false;
      }
    }
    return false;
  }
  return true;
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
  isTokenExpired,
  getWalletAddress,
  generateToken,
  saveToken,
  refreshTokenIfNeeded
};