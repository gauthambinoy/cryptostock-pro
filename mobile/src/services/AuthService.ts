import axios from 'axios';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { User } from '../context/AuthContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;

      // Cache credentials for biometric login
      await SecureStore.setItemAsync('userEmail', email);
      await SecureStore.setItemAsync('userPassword', password);

      return { token, user };
    } catch (error) {
      throw new Error('Login failed');
    }
  },

  async register(email: string, password: string, name: string) {
    try {
      const response = await apiClient.post('/auth/register', { email, password, name });
      const { token, user } = response.data;

      await SecureStore.setItemAsync('userEmail', email);
      await SecureStore.setItemAsync('userPassword', password);

      return { token, user };
    } catch (error) {
      throw new Error('Registration failed');
    }
  },

  async getCurrentUser(token: string): Promise<User> {
    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await apiClient.get('/auth/me');
      return response.data.user;
    } catch (error) {
      throw new Error('Failed to fetch user');
    }
  },

  async biometricAuth() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        throw new Error('Biometric authentication not available');
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        throw new Error('No biometric enrolled');
      }

      const authenticated = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: 'Authenticate to access AssetPulse',
      });

      if (!authenticated.success) {
        throw new Error('Biometric authentication failed');
      }

      // Retrieve cached credentials
      const email = await SecureStore.getItemAsync('userEmail');
      const password = await SecureStore.getItemAsync('userPassword');

      if (!email || !password) {
        throw new Error('Cached credentials not found');
      }

      return this.login(email, password);
    } catch (error) {
      throw error;
    }
  },

  async logout(token: string) {
    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await apiClient.post('/auth/logout');
      delete apiClient.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async refreshToken(token: string) {
    try {
      const response = await apiClient.post('/auth/refresh', { token });
      return response.data.token;
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  },

  setAuthToken(token: string) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  getApiClient() {
    return apiClient;
  },
};
