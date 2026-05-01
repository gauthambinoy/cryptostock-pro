/**
 * Unit tests for Zustand stores
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../api', () => ({
  authAPI: {
    login: vi.fn().mockResolvedValue({ data: { message: 'success' } }),
    logout: vi.fn().mockResolvedValue({ data: { message: 'success' } }),
    getMe: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    }),
  },
  portfolioAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getHoldings: vi.fn().mockResolvedValue({ data: [] }),
  },
  marketAPI: {},
  alertsAPI: {},
}));

import { useAuthStore, usePortfolioStore, useMarketStore, useAlertsStore } from '../store';
describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      isAuthenticated: false,
    });
  });

  it('should initialize with correct default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(false);
  });

  it('should set user when login succeeds', async () => {
    const { login } = useAuthStore.getState();
    const result = await login('test@example.com', 'password');
    const state = useAuthStore.getState();

    expect(result).toBe(true);
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('test@example.com');
  });

  it('should set error on login failure', async () => {
    const store = useAuthStore.getState();
    store.error = 'Invalid credentials';
    expect(store.error).toBe('Invalid credentials');
  });

  it('should clear user on logout', async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      isAuthenticated: true,
    });

    const { logout } = useAuthStore.getState();
    await logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('Portfolio Store', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      portfolios: [],
      currentPortfolio: null,
      holdings: [],
      performance: null,
      isLoading: false,
      error: null,
    });
  });

  it('should initialize with correct default state', () => {
    const state = usePortfolioStore.getState();
    expect(state.portfolios).toEqual([]);
    expect(state.holdings).toEqual([]);
    expect(state.currentPortfolio).toBeNull();
  });

  it('should set current portfolio', () => {
    const portfolio = {
      id: 1,
      name: 'Main Portfolio',
      created_at: new Date().toISOString(),
      total_value: 10000,
      total_gain_loss: 500,
      total_gain_loss_percent: 5.0,
    };

    const { setCurrentPortfolio } = usePortfolioStore.getState();
    setCurrentPortfolio(portfolio);

    const state = usePortfolioStore.getState();
    expect(state.currentPortfolio).toEqual(portfolio);
  });

  it('should handle error when fetching portfolios', () => {
    usePortfolioStore.setState({
      error: 'Failed to fetch portfolios',
    });

    const state = usePortfolioStore.getState();
    expect(state.error).toBe('Failed to fetch portfolios');
  });
});

describe('Market Store', () => {
  beforeEach(() => {
    useMarketStore.setState({
      overview: null,
      stockGainers: [],
      cryptoGainers: [],
      isLoading: false,
      error: null,
    });
  });

  it('should initialize with correct default state', () => {
    const state = useMarketStore.getState();
    expect(state.overview).toBeNull();
    expect(state.stockGainers).toEqual([]);
    expect(state.cryptoGainers).toEqual([]);
  });

  it('should store gainers data', () => {
    const gainers = [
      { symbol: 'BTC', price: 45000, change: 1000, change_percent: 2.27 },
      { symbol: 'ETH', price: 2500, change: 100, change_percent: 4.17 },
    ];

    useMarketStore.setState({ cryptoGainers: gainers });

    const state = useMarketStore.getState();
    expect(state.cryptoGainers).toHaveLength(2);
    expect(state.cryptoGainers[0].symbol).toBe('BTC');
  });
});

describe('Alerts Store', () => {
  beforeEach(() => {
    useAlertsStore.setState({
      alerts: [],
      isLoading: false,
    });
  });

  it('should initialize with correct default state', () => {
    const state = useAlertsStore.getState();
    expect(state.alerts).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it('should handle alert creation', async () => {
    const alert = {
      id: 1,
      symbol: 'BTC',
      target_value: 50000,
      is_active: true,
    };

    useAlertsStore.setState({
      alerts: [alert],
    });

    const state = useAlertsStore.getState();
    expect(state.alerts).toHaveLength(1);
    expect(state.alerts[0].symbol).toBe('BTC');
  });
});
