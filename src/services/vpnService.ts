// src/services/vpnService.ts
import axios from 'axios';
import { config } from '@/config/env';
import { authService } from './authService';

// Base URL for VPN requests
const VPN_API_BASE = `${config.API_BASE_URL}/vpn`;
const API_BASE = `${config.API_BASE_URL}`;

// Interface for VPN rewards
export interface VPNRewardsData {
  totalEarnings: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyGoal: number;
  progress: number;
}

/**
 * Retrieves the daily claim rewards for the specified wallet address
 */
export const getVPNRewards = async (): Promise<VPNRewardsData> => {
  try {
    // Check that the token is valid and refresh if necessary
    await authService.refreshTokenIfNeeded();
    
    // Use the wallet address stored in the JWT token
    const walletAddress = authService.getWalletAddressFromToken();
    
    if (!walletAddress) {
      throw new Error('Wallet address not available');
    }
    
    // Verify if the JWT token matches the wallet address
    const tokenMatch = await authService.verifyTokenWalletMatch();
    console.log('Token matches wallet address:', tokenMatch);
    
    // Get authentication headers
    const headers = await authService.getAuthHeaders();
    
    console.log('Retrieving daily claim rewards for:', walletAddress);
    console.log('Authentication headers:', headers);
    
    const response = await axios.get(`${API_BASE}/dailyClaims`, {
      headers,
      params: { walletAddress }
    });
    
    console.log('Daily claims API response:', response.data);
    
    // Explicit typing for response.data
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
    
    // In case of unsuccessful response, return default values
    return {
      totalEarnings: 0,
      dailyEarnings: 0,
      weeklyEarnings: 0,
      monthlyGoal: 1000,
      progress: 0
    };
  } catch (error) {
    console.error('Error retrieving daily claim rewards:', error);
    
    // In case of error, return default values
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
