import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Utilise extra.apiUrl de app.json (inclus dans le build EAS) en priorité
const API_URL = Constants.expoConfig?.extra?.apiUrl?.replace(/\/api$/, '') || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                'https://appstore-build-audit.preview.emergentagent.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage wrapper compatible web + native
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    // Ne pas ajouter de token pour les routes d'authentification
    const isAuthRoute = config.url?.includes('/auth/login') || 
                        config.url?.includes('/auth/signup');
    
    if (!isAuthRoute) {
      const token = await storage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export { storage };
export default api;
