// src/services/vpnService.ts
import axios from 'axios';
import { config } from '@/config/env';
import { authService } from './authService';

// URL de base pour les requêtes VPN
const VPN_API_BASE = `${config.API_BASE_URL}/vpn`;

// Interface pour les récompenses VPN
export interface VPNRewardsData {
  totalEarnings: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyGoal: number;
  progress: number;
}

/**
 * Récupère les récompenses du nœud VPN pour l'adresse du wallet spécifiée
 */
export const getVPNRewards = async (): Promise<VPNRewardsData> => {
  try {
    // Vérifier que le token est valide et le rafraîchir si nécessaire
    await authService.refreshTokenIfNeeded();
    
    // Utiliser l'adresse du wallet stockée dans le token JWT
    const walletAddress = authService.getWalletAddressFromToken();
    
    if (!walletAddress) {
      throw new Error('Adresse de wallet non disponible');
    }
    
    // Vérifier si le token JWT correspond à l'adresse du wallet
    const tokenMatch = await authService.verifyTokenWalletMatch();
    console.log('Le token correspond à l\'adresse du wallet:', tokenMatch);
    
    // Obtenir les en-têtes d'authentification
    const headers = await authService.getAuthHeaders();
    
    console.log('Récupération des récompenses VPN pour:', walletAddress);
    console.log('Entêtes d\'authentification:', headers);
    
    const response = await axios.get(`${VPN_API_BASE}/rewards`, {
      headers,
      params: { walletAddress }
    });
    
    console.log('Réponse API récompenses VPN:', response.data);
    
    // Typage explicite pour response.data
    const responseData = response.data as {
      success?: boolean;
      totalEarnings?: number;
      dailyEarnings?: number;
      weeklyEarnings?: number;
      monthlyGoal?: number;
      progress?: number;
    };
    
    if (responseData && responseData.success) {
      return {
        totalEarnings: responseData.totalEarnings || 0,
        dailyEarnings: responseData.dailyEarnings || 0,
        weeklyEarnings: responseData.weeklyEarnings || 0,
        monthlyGoal: responseData.monthlyGoal || 1000,
        progress: responseData.progress || 0
      };
    }
    
    // En cas de réponse sans succès, retourner des valeurs par défaut
    return {
      totalEarnings: 0,
      dailyEarnings: 0,
      weeklyEarnings: 0,
      monthlyGoal: 1000,
      progress: 0
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des récompenses VPN:', error);
    
    // En cas d'erreur, retourner des valeurs par défaut
    return {
      totalEarnings: 0,
      dailyEarnings: 0,
      weeklyEarnings: 0,
      monthlyGoal: 1000,
      progress: 0
    };
  }
};

export default {
  getVPNRewards
};
