// src/services/apiService.ts
import axios from 'axios';
import { config } from '@/config/env';
import { getAuthHeader, isAuthenticated, getToken } from './authService';

// Types pour Axios compatibles avec différentes versions
type AxiosConfig = any;
type AxiosResponseType = any;

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
dhtClient.interceptors.request.use(async (config: AxiosConfig) => {
  if (!config.headers) {
    config.headers = {};
  }
  
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

// Interface pour les options de requête
interface RequestOptions {
  retry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  retryStatusCodes?: number[];
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

/**
 * Service API pour effectuer des requêtes HTTP
 * Gère l'authentification, les retries, et les erreurs
 */
class ApiService {
  private isOffline: boolean = false;
  private offlineListeners: Array<(isOffline: boolean) => void> = [];

  constructor() {
    // Intercepteur pour ajouter les headers d'authentification
    apiClient.interceptors.request.use(async (config: AxiosConfig) => {
      if (!config.headers) {
        config.headers = {};
      }
      
      if (!config.headers.Authorization) {
        const authHeader = getAuthHeader();
        Object.entries(authHeader).forEach(([key, value]) => {
          if (config.headers && value !== undefined) {
            config.headers[key] = value;
          }
        });
      }
      
      // Ajouter le wallet address si disponible (pour WireGuard)
      const walletAddress = localStorage.getItem('walletAddress');
      if (walletAddress) {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers['X-Wallet-Address'] = walletAddress;
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
   * Vérifie si une erreur est due à un timeout ou une erreur réseau
   */
  private isNetworkError(error: any): boolean {
    // Vérifier si c'est une erreur réseau
    return (
      error &&
      (error.message === 'Network Error' ||
       // Vérifier si c'est une erreur Axios
       (typeof error === 'object' && 
        // Utiliser une vérification de propriété plus sûre pour isAxiosError
        (error.isAxiosError === true) &&
        // Vérifier les propriétés spécifiques aux erreurs Axios
        ((typeof error.code === 'string' && error.code === 'ECONNABORTED') ||
         (typeof error.message === 'string' && error.message.includes('timeout')) ||
         // Vérifier si la propriété response existe
         !('response' in error)))
      )
    );
  }

  /**
   * Effectue une requête API avec gestion des erreurs et retry
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<AxiosResponseType> {
    const {
      retry = true,
      maxRetries = 3,
      retryDelay = 1000,
      retryStatusCodes = [408, 429, 500, 502, 503, 504],
      headers = {},
      params = {},
      timeout = config.DEFAULT_TIMEOUT,
      ...axiosOptions
    } = options;

    let retries = 0;
    let lastError: any = null;

    // Fonction pour effectuer la requête avec retry
    const executeRequest = async (): Promise<AxiosResponseType> => {
      try {
        const config: AxiosConfig = {
          method,
          url,
          headers: { ...headers },
          params,
          data,
          timeout,
          ...axiosOptions,
        };

        const response = await apiClient(config);
        return response;
      } catch (error) {
        if (error instanceof Error) {
          lastError = error;
          
          // Vérifier si c'est une erreur réseau
          const isNetworkError = this.isNetworkError(error);

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
      
      return response;
    } catch (error) {
      console.error(`Erreur lors de la requête ${method} ${url}:`, error);
      
      // Préparer la réponse d'erreur avec gestion correcte du type d'erreur
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      return {
        data: null,
        error: errorMessage,
        status: this.isOffline ? 'offline' : 'error',
        isOffline: this.isOffline
      };
    }
  }

  /**
   * Effectue une requête GET
   */
  public async get<T>(url: string, params?: any, options?: RequestOptions): Promise<AxiosResponseType> {
    return this.request<T>('get', url, params, options);
  }

  /**
   * Effectue une requête POST
   */
  public async post<T>(url: string, data?: any, options?: RequestOptions): Promise<AxiosResponseType> {
    return this.request<T>('post', url, data, options);
  }

  /**
   * Effectue une requête PUT
   */
  public async put<T>(url: string, data?: any, options?: RequestOptions): Promise<AxiosResponseType> {
    return this.request<T>('put', url, data, options);
  }

  /**
   * Effectue une requête DELETE
   */
  public async delete<T>(url: string, params?: any, options?: RequestOptions): Promise<AxiosResponseType> {
    return this.request<T>('delete', url, params, options);
  }

  /**
   * Récupère les récompenses quotidiennes
   */
  public async fetchRewards(walletAddress: string): Promise<AxiosResponseType> {
    const headers: Record<string, string> = {};
    
    // Ajouter les headers d'authentification
    const authHeader = getAuthHeader();
    Object.entries(authHeader).forEach(([key, value]) => {
      if (value !== undefined) {
        headers[key] = value as string;
      }
    });
    
    // Ajouter l'adresse du wallet
    headers['X-Wallet-Address'] = walletAddress;
    
    return this.get('/dailyClaims', null, { headers });
  }

  /**
   * Réclame les récompenses quotidiennes
   */
  public async claimRewards(walletAddress: string): Promise<AxiosResponseType> {
    const headers: Record<string, string> = {};
    
    // Ajouter les headers d'authentification
    const authHeader = getAuthHeader();
    Object.entries(authHeader).forEach(([key, value]) => {
      if (value !== undefined) {
        headers[key] = value as string;
      }
    });
    
    return this.post('/dailyClaims/claim', { walletAddress }, { headers });
  }

  /**
   * Vérifie le statut du backend API (pas spécifiquement les nœuds DHT)
   * Cette méthode est utilisée pour déterminer si le backend est accessible
   */
  public async checkBackendStatus(): Promise<AxiosResponseType> {
    try {
      const response = await axios.get(`${config.API_BASE_URL}/status`, {
        timeout: 5000 // Timeout court pour cette vérification
      });
      
      this.setOfflineStatus(false);
      return {
        data: response.data,
        error: null,
        status: 'success',
        isOffline: false
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du statut du backend:', error);
      this.setOfflineStatus(true);
      
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Erreur de connexion',
        status: 'offline',
        isOffline: true
      };
    }
  }

  /**
   * Vérifie spécifiquement le statut des nœuds DHT
   * Cette méthode interroge le service DHT pour obtenir l'état des nœuds
   */
  public async checkDHTStatus(): Promise<AxiosResponseType> {
    try {
      const response = await dhtClient.get('/status', {
        headers: getAuthHeader() as Record<string, string>
      });
      
      this.setOfflineStatus(false);
      return {
        data: response.data,
        error: null,
        status: 'success',
        isOffline: false
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du statut DHT:', error);
      
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Erreur de connexion DHT',
        status: 'error',
        isOffline: this.isOffline
      };
    }
  }

  /**
   * Récupère les nœuds DHT disponibles
   */
  public async fetchDHTNodes(): Promise<AxiosResponseType> {
    try {
      const response = await dhtClient.get('/nodes', {
        headers: getAuthHeader() as Record<string, string>
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
  public async startDHT(): Promise<AxiosResponseType> {
    try {
      const response = await dhtClient.post('/start', {}, {
        headers: getAuthHeader() as Record<string, string>
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
  public async stopDHT(): Promise<AxiosResponseType> {
    try {
      const response = await dhtClient.post('/stop', {}, {
        headers: getAuthHeader() as Record<string, string>
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