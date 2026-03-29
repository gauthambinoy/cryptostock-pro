import { create } from 'zustand';
import { authAPI, portfolioAPI, marketAPI, alertsAPI } from './api';

// Auth Store
export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login({ email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      set({ token: access_token });
      await get().fetchUser();
      return true;
    } catch (error) {
      set({ error: error.response?.data?.detail || 'Login failed' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.register(data);
      return await get().login(data.email, data.password);
    } catch (error) {
      set({ error: error.response?.data?.detail || 'Registration failed' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  
  guestLogin: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.guest();
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      set({ token: access_token });
      await get().fetchUser();
      return true;
    } catch (error) {
      set({ error: error.response?.data?.detail || 'Guest login failed' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  
  fetchUser: async () => {
    try {
      const response = await authAPI.getMe();
      set({ user: response.data });
    } catch (error) {
      get().logout();
    }
  },
}));

// Portfolio Store
export const usePortfolioStore = create((set, get) => ({
  portfolios: [],
  currentPortfolio: null,
  holdings: [],
  performance: null,
  isLoading: false,
  error: null,
  
  fetchPortfolios: async () => {
    set({ isLoading: true });
    try {
      const response = await portfolioAPI.getAll();
      const portfolios = response.data;
      set({ portfolios });
      if (portfolios.length > 0 && !get().currentPortfolio) {
        set({ currentPortfolio: portfolios[0] });
        await get().fetchHoldings(portfolios[0].id);
      }
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchHoldings: async (portfolioId) => {
    set({ isLoading: true });
    try {
      const response = await portfolioAPI.getHoldings(portfolioId);
      set({ holdings: response.data });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addHolding: async (portfolioId, data) => {
    try {
      await portfolioAPI.addHolding(portfolioId, data);
      await get().fetchHoldings(portfolioId);
      await get().fetchPortfolios();
      return true;
    } catch (error) {
      set({ error: error.response?.data?.detail || 'Failed to add holding' });
      return false;
    }
  },
  
  deleteHolding: async (portfolioId, holdingId) => {
    try {
      await portfolioAPI.deleteHolding(portfolioId, holdingId);
      await get().fetchHoldings(portfolioId);
      await get().fetchPortfolios();
    } catch (error) {
      set({ error: error.message });
    }
  },
  
  fetchPerformance: async (portfolioId) => {
    try {
      const response = await portfolioAPI.getPerformance(portfolioId);
      set({ performance: response.data });
    } catch (error) {
      set({ error: error.message });
    }
  },
  
  setCurrentPortfolio: (portfolio) => {
    set({ currentPortfolio: portfolio });
    get().fetchHoldings(portfolio.id);
  },
}));

// Market Store
export const useMarketStore = create((set) => ({
  overview: null,
  stockGainers: [],
  cryptoGainers: [],
  isLoading: false,
  error: null,
  
  fetchOverview: async () => {
    set({ isLoading: true });
    try {
      const response = await marketAPI.getOverview();
      set({ 
        overview: response.data,
        stockGainers: response.data.top_stock_gainers || [],
        cryptoGainers: response.data.top_crypto_gainers || []
      });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchStockGainers: async (limit = 15) => {
    try {
      const response = await marketAPI.getStockGainers(limit);
      set({ stockGainers: response.data });
    } catch (error) {
      set({ error: error.message });
    }
  },
  
  fetchCryptoGainers: async (limit = 15) => {
    try {
      const response = await marketAPI.getCryptoGainers(limit);
      set({ cryptoGainers: response.data });
    } catch (error) {
      set({ error: error.message });
    }
  },
}));

// Alerts Store
export const useAlertsStore = create((set, get) => ({
  alerts: [],
  isLoading: false,
  
  fetchAlerts: async () => {
    set({ isLoading: true });
    try {
      const response = await alertsAPI.getAll();
      set({ alerts: response.data });
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  createAlert: async (data) => {
    try {
      await alertsAPI.create(data);
      await get().fetchAlerts();
      return true;
    } catch (error) {
      return false;
    }
  },
  
  deleteAlert: async (alertId) => {
    try {
      await alertsAPI.delete(alertId);
      await get().fetchAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  },
}));
