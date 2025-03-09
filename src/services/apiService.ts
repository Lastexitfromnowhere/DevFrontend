// src/services/apiService.ts
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { config } from '@/config/env';
import { getAuthHeader, isAuthenticated, getToken } from './authService';

// Configuration de base pour axios
const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configuration pour le service DHT
const dhtClient = axios.create({
  baseURL: config.DHT_API_URL,
  timeout: config.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajouter un intercepteur pour les requêtes DHT également
dhtClient.interceptors.request.use(async (config) => {
  const token = getToken();
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// Interface pour les options de requête
interface RequestOptions extends AxiosRequestConfig {
  retry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackData?: any;
  silentError?: boolean;
}

// Interface pour les résultats API
interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: 'success' | 'error' | 'offline';
  isOffline: boolean;
}

/**
 * Service API pour gérer les requêtes au backend avec gestion des erreurs
 */
class ApiService {
  private isOffline: boolean = false;
  private offlineListeners: Array<(isOffline: boolean) => void> = [];

  constructor() {
    // Intercepteur pour ajouter les headers d'authentification
    apiClient.interceptors.request.use(async (config) => {
      if (!config.headers.Authorization) {
        const authHeader = getAuthHeader();
        Object.entries(authHeader).forEach(([key, value]) => {
          if (config.headers && value !== undefined) {
            config.headers[key] = value;
          }
        });
      }
      return config;
    });

    // Vérifier l'état de la connexion au démarrage
    this.checkConnection();
  }

  /**
   * Vérifie l'état de la connexion au backend
   */
  private async checkConnection(): Promise<void> {
    try {
      await this.checkBackendStatus();
      this.setOfflineStatus(false);
    } catch (error) {
      this.setOfflineStatus(true);
      // Planifier une nouvelle vérification après un délai
      setTimeout(() => this.checkConnection(), 30000);
    }
  }

  /**
   * Met à jour l'état de connexion et notifie les listeners
   */
  private setOfflineStatus(status: boolean): void {
    if (this.isOffline !== status) {
      this.isOffline = status;
      // Notifier tous les listeners
      this.offlineListeners.forEach(listener => listener(status));
      
      if (status) {
        console.warn('Application en mode hors ligne. Les fonctionnalités peuvent être limitées.');
      } else {
        console.log('Connexion au backend rétablie.');
      }
    }
  }

  /**
   * Ajoute un listener pour les changements d'état de connexion
   */
  public addOfflineListener(listener: (isOffline: boolean) => void): () => void {
    this.offlineListeners.push(listener);
    // Appeler immédiatement avec l'état actuel
    listener(this.isOffline);
    
    // Retourner une fonction pour supprimer le listener
    return () => {
      this.offlineListeners = this.offlineListeners.filter(l => l !== listener);
    };
  }

  /**
   * Effectue une requête API avec gestion des erreurs et retry
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      retry = true,
      maxRetries = 3,
      retryDelay = 1000,
      fallbackData = null,
      silentError = false,
      ...axiosOptions
    } = options;

    let retries = 0;
    let lastError: AxiosError | Error | null = null;

    // Fonction pour effectuer la requête avec retry
    const executeRequest = async (): Promise<AxiosResponse<T>> => {
      try {
        const config: AxiosRequestConfig = {
          method,
          url,
          ...axiosOptions,
        };

        if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
          config.data = data;
        } else if (data) {
          config.params = data;
        }

        return await apiClient(config);
      } catch (error) {
        if (error instanceof Error) {
          lastError = error;
          
          // Vérifier si c'est une erreur réseau
          const isNetworkError = 
            axios.isAxiosError(error) && 
            (error.code === 'ECONNABORTED' || 
             error.message.includes('Network Error') ||
             !error.response);

          // Si c'est une erreur réseau et qu'on peut réessayer
          if (isNetworkError && retry && retries < maxRetries) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
            return executeRequest();
          }

          // Si c'est une erreur réseau, marquer comme hors ligne
          if (isNetworkError) {
            this.setOfflineStatus(true);
          }
        }
        throw error;
      }
    };

    try {
      const response = await executeRequest();
      // Si la requête réussit, on est en ligne
      this.setOfflineStatus(false);
      
      return {
        data: response.data,
        error: null,
        status: 'success',
        isOffline: false
      };
    } catch (error) {
      if (!silentError) {
        console.error(`Erreur lors de la requête ${method} ${url}:`, error);
      }

      // Préparer la réponse d'erreur avec gestion correcte du type d'erreur
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      return {
        data: fallbackData,
        error: errorMessage,
        status: this.isOffline ? 'offline' : 'error',
        isOffline: this.isOffline
      };
    }
  }

  /**
   * Effectue une requête GET
   */
  public async get<T>(url: string, params?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('get', url, params, options);
  }

  /**
   * Effectue une requête POST
   */
  public async post<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('post', url, data, options);
  }

  /**
   * Effectue une requête PUT
   */
  public async put<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('put', url, data, options);
  }

  /**
   * Effectue une requête DELETE
   */
  public async delete<T>(url: string, params?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('delete', url, params, options);
  }

  /**
   * Récupère les récompenses quotidiennes
   */
  public async fetchRewards(walletAddress: string): Promise<ApiResponse> {
    return this.get('/dailyClaims', null, {
      headers: {
        ...getAuthHeader(),
        'X-Wallet-Address': walletAddress
      },
      fallbackData: {
        success: true,
        canClaimToday: false,
        lastClaimDate: null,
        nextClaimTime: null,
        claimHistory: [],
        totalClaimed: 0,
        consecutiveDays: 0
      }
    });
  }

  /**
   * Réclame les récompenses quotidiennes
   */
  public async claimRewards(walletAddress: string): Promise<ApiResponse> {
    return this.post('/dailyClaims/claim', { walletAddress }, {
      headers: {
        ...getAuthHeader()
      }
    });
  }

  /**
   * Vérifie le statut du backend API (pas spécifiquement les nœuds DHT)
   * Cette méthode est utilisée pour déterminer si le backend est accessible
   */
  public async checkBackendStatus(): Promise<ApiResponse> {
    try {
      const response = await axios.get(`${config.API_BASE_URL}/status`, {
        timeout: 5000 // Timeout court pour cette vérification
      });
      
      return {
        data: response.data,
        error: null,
        status: 'success',
        isOffline: false
      };
    } catch (error) {
      this.setOfflineStatus(true);
      const errorMessage = error instanceof Error ? error.message : 'Serveur inaccessible';
      return {
        data: null,
        error: errorMessage,
        status: 'offline',
        isOffline: true
      };
    }
  }

  /**
   * Vérifie spécifiquement le statut des nœuds DHT
   * Cette méthode interroge le service DHT pour obtenir l'état des nœuds
   */
  public async checkDHTStatus(): Promise<ApiResponse> {
    try {
      const token = getToken();
      const response = await dhtClient.get('/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        data: response.data,
        error: null,
        status: 'success',
        isOffline: false
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du statut DHT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Service DHT inaccessible';
      return {
        data: null,
        error: errorMessage,
        status: 'error',
        isOffline: this.isOffline
      };
    }
  }

  /**
   * Récupère les nœuds DHT disponibles
   */
  public async fetchDHTNodes(): Promise<ApiResponse> {
    try {
      const token = getToken();
      const response = await dhtClient.get('/nodes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        data: response.data,
        error: null,
        status: 'success',
        isOffline: false
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des nœuds DHT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        data: { nodes: [] },
        error: errorMessage,
        status: 'error',
        isOffline: this.isOffline
      };
    }
  }

  /**
   * Démarre le nœud DHT
   */
  public async startDHT(): Promise<ApiResponse> {
    try {
      const token = getToken();
      const response = await dhtClient.post('/start', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        data: response.data,
        error: null,
        status: 'success',
        isOffline: false
      };
    } catch (error) {
      console.error('Erreur lors du démarrage du DHT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        data: null,
        error: errorMessage,
        status: 'error',
        isOffline: this.isOffline
      };
    }
  }

  /**
   * Arrête le nœud DHT
   */
  public async stopDHT(): Promise<ApiResponse> {
    try {
      const token = getToken();
      const response = await dhtClient.post('/stop', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        data: response.data,
        error: null,
        status: 'success',
        isOffline: false
      };
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du DHT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        data: null,
        error: errorMessage,
        status: 'error',
        isOffline: this.isOffline
      };
    }
  }

  /**
   * Vérifie si l'application est en mode hors ligne
   */
  public getOfflineStatus(): boolean {
    return this.isOffline;
  }
}

// Exporter une instance unique du service
export const apiService = new ApiService();
export default apiService;