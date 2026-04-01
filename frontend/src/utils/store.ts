import { create } from 'zustand';
import { authAPI, portfolioAPI, marketAPI, alertsAPI } from './api';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

interface Portfolio {
  id: number;
  name: string;
  created_at: string;
  total_value: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
}

interface Holding {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  buy_price: number;
  current_price: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  buy_date: string;
  notes?: string;
}

interface Alert {
  id: number;
  symbol: string;
  target_value: number;
  is_active: boolean;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  guestLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

interface PortfolioStore {
  portfolios: Portfolio[];
  currentPortfolio: Portfolio | null;
  holdings: Holding[];
  performance: any;
  isLoading: boolean;
  error: string | null;
  fetchPortfolios: () => Promise<void>;
  fetchHoldings: (portfolioId: number) => Promise<void>;
  addHolding: (portfolioId: number, data: any) => Promise<boolean>;
  deleteHolding: (portfolioId: number, holdingId: number) => Promise<void>;
  fetchPerformance: (portfolioId: number) => Promise<void>;
  setCurrentPortfolio: (portfolio: Portfolio) => void;
}

interface MarketStore {
  overview: any;
  stockGainers: any[];
  cryptoGainers: any[];
  isLoading: boolean;
  error: string | null;
  fetchOverview: () => Promise<void>;
  fetchStockGainers: (limit?: number) => Promise<void>;
  fetchCryptoGainers: (limit?: number) => Promise<void>;
}

interface AlertsStore {
  alerts: Alert[];
  isLoading: boolean;
  fetchAlerts: () => Promise<void>;
  createAlert: (data: any) => Promise<boolean>;
  deleteAlert: (alertId: number) => Promise<void>;
}

// Auth Store
export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.login({ email, password });
      await get().fetchUser();
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Login failed' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.register(data);
      return await get().login(data.email, data.password);
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Registration failed' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  guestLogin: async () => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.guest();
      await get().fetchUser();
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Guest login failed' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchUser: async () => {
    try {
      const response = await authAPI.getMe();
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    }
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await authAPI.getMe();
      set({ user: response.data, isAuthenticated: true, isInitialized: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Portfolio Store
export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
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
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchHoldings: async (portfolioId: number) => {
    set({ isLoading: true });
    try {
      const response = await portfolioAPI.getHoldings(portfolioId);
      set({ holdings: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  addHolding: async (portfolioId: number, data: any) => {
    try {
      await portfolioAPI.addHolding(portfolioId, data);
      await get().fetchHoldings(portfolioId);
      await get().fetchPortfolios();
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to add holding' });
      return false;
    }
  },

  deleteHolding: async (portfolioId: number, holdingId: number) => {
    try {
      await portfolioAPI.deleteHolding(portfolioId, holdingId);
      await get().fetchHoldings(portfolioId);
      await get().fetchPortfolios();
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchPerformance: async (portfolioId: number) => {
    try {
      const response = await portfolioAPI.getPerformance(portfolioId);
      set({ performance: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setCurrentPortfolio: (portfolio: Portfolio) => {
    set({ currentPortfolio: portfolio });
    get().fetchHoldings(portfolio.id);
  },
}));

// Market Store
export const useMarketStore = create<MarketStore>((set) => ({
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
        cryptoGainers: response.data.top_crypto_gainers || [],
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStockGainers: async (limit = 15) => {
    try {
      const response = await marketAPI.getStockGainers(limit);
      set({ stockGainers: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchCryptoGainers: async (limit = 15) => {
    try {
      const response = await marketAPI.getCryptoGainers(limit);
      set({ cryptoGainers: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));

// Alerts Store
export const useAlertsStore = create<AlertsStore>((set, get) => ({
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

  createAlert: async (data: any) => {
    try {
      await alertsAPI.create(data);
      await get().fetchAlerts();
      return true;
    } catch (error) {
      return false;
    }
  },

  deleteAlert: async (alertId: number) => {
    try {
      await alertsAPI.delete(alertId);
      await get().fetchAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  },
}));
