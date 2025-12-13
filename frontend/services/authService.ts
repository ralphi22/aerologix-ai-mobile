import api, { storage } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  subscription: {
    plan: string;
    status: string;
  };
  limits: {
    max_aircrafts: number;
    ocr_per_month: number;
    logbook_entries_per_month: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  name: string;
  password: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<User> {
    // FastAPI OAuth2 expects form data
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, user } = response.data;
    await SecureStore.setItemAsync('auth_token', access_token);
    return user;
  }

  async signup(data: SignupData): Promise<User> {
    const response = await api.post('/api/auth/signup', data);
    const { access_token, user } = response.data;
    await SecureStore.setItemAsync('auth_token', access_token);
    return user;
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/api/auth/me');
    return response.data;
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('auth_token');
  }

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('auth_token');
  }
}

export default new AuthService();
