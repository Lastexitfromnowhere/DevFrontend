// services/authService.js
import axios from 'axios';
import { config } from '../config/env';

// URL de base pour les requêtes d'authentification
const AUTH_API_BASE = config.API_BASE_URL;

// Durée de validité du token en secondes (1 heure par défaut)
const TOKEN_EXPIRY = 3600;

// Fonction pour encoder un token JWT simple côté client
// Note: Ceci est une implémentation simplifiée pour le développement
// En production, les tokens devraient être générés côté serveur
const encodeJWT = (payload, secret = 'votre_secret_jwt_super_securise') => {
  // Créer l'en-tête (header)
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Encoder l'en-tête et le payload en base64
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));

  // Créer la signature (en production, cela utiliserait une vraie fonction de hachage HMAC)
  // Ici, nous créons une signature fictive basée sur le payload pour simuler un token unique
  const signature = btoa(
    Array.from(payload.walletAddress)
      .map(char => char.charCodeAt(0))
      .reduce((acc, val) => acc + val, 0)
      .toString(16)
  );

  // Assembler le token JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Service d'authentification pour gérer les tokens JWT
 */
class AuthService {
  /**
   * Génère un token JWT à partir de l'adresse du wallet
   * @param {string} walletAddress - Adresse du wallet de l'utilisateur
   * @returns {Promise<{token: string, expiresAt: number}>} - Token JWT et date d'expiration
   */
  async generateToken(walletAddress) {
    try {
      // En production, cette requête serait envoyée au backend
      // const response = await axios.post(`${AUTH_API_BASE}/auth/token`, { walletAddress });
      // return response.data;
      
      // Pour le développement, on génère un token basé sur l'adresse du wallet
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + TOKEN_EXPIRY;
      
      // Créer le payload du token
      const payload = {
        walletAddress,
        role: 'user',
        iat: now,
        exp: expiresAt
      };
      
      // Générer un token unique basé sur l'adresse du wallet
      const token = encodeJWT(payload);
      
      console.log(`Token généré pour ${walletAddress}`);
      
      return { token, expiresAt };
    } catch (error) {
      console.error('Erreur lors de la génération du token:', error);
      throw new Error('Impossible de générer un token d\'authentification');
    }
  }

  /**
   * Stocke le token dans le localStorage
   * @param {string} token - Token JWT
   * @param {number} expiresAt - Date d'expiration du token (timestamp Unix)
   * @param {string} walletAddress - Adresse du wallet de l'utilisateur
   */
  saveToken(token, expiresAt, walletAddress) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token_expires_at', expiresAt.toString());
    localStorage.setItem('walletAddress', walletAddress);
    console.log(`Token sauvegardé pour ${walletAddress}`);
  }

  /**
   * Récupère le token depuis le localStorage
   * @returns {string|null} - Token JWT ou null si non trouvé
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Vérifie si le token est expiré
   * @returns {boolean} - true si le token est expiré ou non trouvé
   */
  isTokenExpired() {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return now >= parseInt(expiresAt);
  }

  /**
   * Récupère l'adresse du wallet depuis le localStorage
   * @returns {string|null} - Adresse du wallet ou null si non trouvée
   */
  getWalletAddress() {
    return localStorage.getItem('walletAddress');
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   * @returns {boolean} - true si l'utilisateur est authentifié
   */
  isAuthenticated() {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  }

  /**
   * Déconnecte l'utilisateur en supprimant le token
   */
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token_expires_at');
    // On garde l'adresse du wallet pour faciliter la reconnexion
  }

  /**
   * Rafraîchit le token s'il est expiré
   * @returns {Promise<string>} - Token JWT rafraîchi
   */
  async refreshTokenIfNeeded() {
    if (this.isTokenExpired()) {
      const walletAddress = this.getWalletAddress();
      if (!walletAddress) {
        throw new Error('Adresse de wallet non trouvée');
      }
      
      const { token, expiresAt } = await this.generateToken(walletAddress);
      this.saveToken(token, expiresAt, walletAddress);
      return token;
    }
    
    return this.getToken();
  }

  /**
   * Récupère les en-têtes d'authentification pour les requêtes API
   * @returns {Object} - En-têtes d'authentification
   */
  async getAuthHeaders() {
    const token = await this.refreshTokenIfNeeded();
    const walletAddress = this.getWalletAddress();
    
    // Retourner un objet simple avec les en-têtes
    const headers = {};
    
    headers['Content-Type'] = 'application/json';
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (walletAddress) {
      headers['X-Wallet-Address'] = walletAddress;
    }
    
    return headers;
  }
}

// Exporter une instance unique du service
export const authService = new AuthService();
export default authService;
