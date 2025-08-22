import axios from 'axios';
import { config } from '@/config/env';
import { getAuthHeader, isAuthenticated, getToken } from './authService';
type AxiosConfig = any;
type AxiosResponseType = any;
const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});
const dhtClient = axios.create({
  baseURL: config.DHT_API_URL,
  timeout: config.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});
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
class ApiService {
  private isOffline: boolean = false;
  private offlineListeners: Array<(isOffline: boolean) => void> = [];
  constructor() {
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
      const walletAddress = localStorage.getItem('walletAddress');
      if (walletAddress) {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers['X-Wallet-Address'] = walletAddress;
      }
      return config;
    });
    this.checkConnection();
  }
  private async checkConnection(): Promise<void> {
    try {
      await this.checkBackendStatus();
      this.setOfflineStatus(false);
    } catch (error) {
      this.setOfflineStatus(true);
      setTimeout(() => this.checkConnection(), 30000);
    }
  }
  private setOfflineStatus(status: boolean): void {
    if (this.isOffline !== status) {
      this.isOffline = status;
      this.offlineListeners.forEach(listener => listener(status));
      if (status) {
        console.warn('Application en mode hors ligne. Les fonctionnalités peuvent être limitées.');
      } else {
        console.log('Connexion au backend rétablie.');
      }
    }
  }
  public addOfflineListener(listener: (isOffline: boolean) => void): () => void {
    this.offlineListeners.push(listener);
    listener(this.isOffline);
    return () => {
      this.offlineListeners = this.offlineListeners.filter(l => l !== listener);
    };
  }
  private isNetworkError(error: any): boolean {
    return (
      error &&
      (error.message === 'Network Error' ||
       (typeof error === 'object' && 
        (error.isAxiosError === true) &&
        ((typeof error.code === 'string' && error.code === 'ECONNABORTED') ||
         (typeof error.message === 'string' && error.message.includes('timeout')) ||
         !('response' in error)))
      )
    );
  }
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
          const isNetworkError = this.isNetworkError(error);
          if (isNetworkError && retry && retries < maxRetries) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
            return executeRequest();
          }
          if (isNetworkError) {
            this.setOfflineStatus(true);
          }
        }
        throw error;
      }
    };
    try {
      const response = await executeRequest();
      this.setOfflineStatus(false);
      return response;
    } catch (error) {
      console.error(`Erreur lors de la requête ${method} ${url}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        data: null,
        error: errorMessage,
        status: this.isOffline ? 'offline' : 'error',
        isOffline: this.isOffline
      };
    }
  }
  public async get<T>(url: string, params?: any, options?: RequestOptions): Promise<AxiosResponseType> {
    return this.request<T>('get', url, params, options);
  }
  public async post<T>(url: string, data?: any, options?: RequestOptions): Promise<AxiosResponseType> {
    return this.request<T>('post', url, data, options);
  }
  public async put<T>(url: string, data?: any, options?: RequestOptions): Promise<AxiosResponseType> {
    return this.request<T>('put', url, data, options);
  }
  public async delete<T>(url: string, params?: any, options?: RequestOptions): Promise<AxiosResponseType> {
    return this.request<T>('delete', url, params, options);
  }
  public async fetchRewards(walletAddress: string): Promise<AxiosResponseType> {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    Object.entries(authHeader).forEach(([key, value]) => {
      if (value !== undefined) {
        headers[key] = value as string;
      }
    });
    headers['X-Wallet-Address'] = walletAddress;
    return this.get('/dailyClaims', null, { headers });
  }
  public async claimRewards(walletAddress: string): Promise<AxiosResponseType> {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    Object.entries(authHeader).forEach(([key, value]) => {
      if (value !== undefined) {
        headers[key] = value as string;
      }
    });
    return this.post('/dailyClaims/claim', { walletAddress }, { headers });
  }
  public async checkBackendStatus(): Promise<AxiosResponseType> {
    try {
      const response = await axios.get(`${config.API_BASE_URL}/status`, {
        timeout: 5000 
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
  public getOfflineStatus(): boolean {
    return this.isOffline;
  }
}
export const apiService = new ApiService();
export default apiService;