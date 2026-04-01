import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Enable cookie-based authentication
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any cached auth data and redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login/json', data),
  logout: () => api.post('/auth/logout'),
  guest: () => api.post('/auth/guest'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

// Portfolio API
export const portfolioAPI = {
  getAll: () => api.get('/portfolio'),
  create: (data: any) => api.post('/portfolio', data),
  getHoldings: (portfolioId: number) => api.get(`/portfolio/${portfolioId}/holdings`),
  addHolding: (portfolioId: number, data: any) => api.post(`/portfolio/${portfolioId}/holdings`, data),
  updateHolding: (portfolioId: number, holdingId: number, data: any) =>
    api.put(`/portfolio/${portfolioId}/holdings/${holdingId}`, data),
  deleteHolding: (portfolioId: number, holdingId: number) =>
    api.delete(`/portfolio/${portfolioId}/holdings/${holdingId}`),
  getPerformance: (portfolioId: number) => api.get(`/portfolio/${portfolioId}/performance`),
};

// Market API
export const marketAPI = {
  getOverview: () => api.get('/market/overview'),
  getStockQuote: (symbol: string) => api.get(`/market/stocks/quote/${symbol}`),
  getCryptoQuote: (symbol: string) => api.get(`/market/crypto/quote/${symbol}`),
  getStockGainers: (limit = 10) => api.get(`/market/stocks/gainers?limit=${limit}`),
  getCryptoGainers: (limit = 10) => api.get(`/market/crypto/gainers?limit=${limit}`),
  getStockHistory: (symbol: string, period = '1mo') =>
    api.get(`/market/stocks/history/${symbol}?period=${period}`),
  getCryptoHistory: (symbol: string, days = 30) =>
    api.get(`/market/crypto/history/${symbol}?days=${days}`),
  search: (query: string, assetType?: string) =>
    api.get(`/market/search?query=${query}${assetType ? `&asset_type=${assetType}` : ''}`),
};

// Alerts API
export const alertsAPI = {
  getAll: (activeOnly = true) => api.get(`/alerts?active_only=${activeOnly}`),
  create: (data: any) => api.post('/alerts', data),
  delete: (alertId: number) => api.delete(`/alerts/${alertId}`),
  toggle: (alertId: number) => api.put(`/alerts/${alertId}/toggle`),
  check: () => api.post('/alerts/check'),
};

// Watchlist API
export const watchlistAPI = {
  getAll: () => api.get('/watchlist'),
  add: (symbol: string, assetType: string) => api.post(`/watchlist?symbol=${symbol}&asset_type=${assetType}`),
  remove: (itemId: number) => api.delete(`/watchlist/${itemId}`),
};

// Transactions API
export const transactionsAPI = {
  getAll: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/transactions${query ? '?' + query : ''}`);
  },
  create: (data: any) => api.post('/transactions', data),
  export: () => api.get('/transactions/export', { responseType: 'blob' }),
  summary: () => api.get('/transactions/summary'),
};

// Goals API
export const goalsAPI = {
  getAll: () => api.get('/goals'),
  create: (data: any) => api.post('/goals', data),
  update: (goalId: number, data: any) => api.put(`/goals/${goalId}`, data),
  delete: (goalId: number) => api.delete(`/goals/${goalId}`),
};

// Dividends API
export const dividendsAPI = {
  getAll: () => api.get('/dividends'),
  create: (data: any) => api.post('/dividends', data),
  delete: (dividendId: number) => api.delete(`/dividends/${dividendId}`),
  summary: () => api.get('/dividends/summary'),
};

// Analytics API
export const analyticsAPI = {
  getAdvanced: (portfolioId: number) => api.get(`/analytics/${portfolioId}/advanced`),
  getCorrelation: (portfolioId: number) => api.get(`/analytics/${portfolioId}/correlation`),
  getPnlCalendar: (portfolioId: number) => api.get(`/analytics/${portfolioId}/pnl-calendar`),
  getSectorBreakdown: (portfolioId: number) => api.get(`/analytics/${portfolioId}/sector-breakdown`),
  getPerformanceHistory: (portfolioId: number, days = 90) =>
    api.get(`/analytics/${portfolioId}/performance-history?days=${days}`),
};

// News API
export const newsAPI = {
  getAll: () => api.get('/news'),
  getForSymbol: (symbol: string) => api.get(`/news/symbol/${symbol}`),
};

// Prediction API
export const predictionAPI = {
  predict: (symbol: string, assetType = 'stock') =>
    api.get(`/prediction/${symbol}?asset_type=${assetType}`),
};

// Converter API
export const converterAPI = {
  convert: (from: string, to: string, amount: number) =>
    api.get(`/converter/convert?from_currency=${from}&to_currency=${to}&amount=${amount}`),
  cryptoConvert: (from: string, to: string, amount: number) =>
    api.get(`/converter/crypto-convert?from_symbol=${from}&to_symbol=${to}&amount=${amount}`),
  rates: (base = 'USD') => api.get(`/converter/rates?base=${base}`),
};

// Leaderboard API
export const leaderboardAPI = {
  getAll: () => api.get('/leaderboard'),
};

// Share API
export const shareAPI = {
  create: (portfolioId: number) => api.post(`/share/${portfolioId}`),
  get: (shareId: string) => api.get(`/share/${shareId}`),
};

// Preferences API
export const preferencesAPI = {
  get: () => api.get('/preferences'),
  update: (data: any) => api.put('/preferences', data),
};

// Export API
export const exportAPI = {
  pdfData: (portfolioId: number) => api.get(`/export/portfolio/${portfolioId}/pdf`),
  csv: (portfolioId: number) => api.get(`/export/portfolio/${portfolioId}/csv`, { responseType: 'blob' }),
};

// Tools API
export const toolsAPI = {
  screener: (params: any) => api.get('/tools/screener', { params }),
  levels: (symbol: string, assetType = 'stock') =>
    api.get(`/tools/levels/${symbol}?asset_type=${assetType}`),
  dca: (params: any) => api.get('/tools/dca', { params }),
  taxReport: () => api.get('/tools/tax-report'),
  rebalance: (portfolioId: number, strategy = 'equal_weight') =>
    api.get(`/tools/rebalance/${portfolioId}?strategy=${strategy}`),
};

// Investment Analysis API
export const investAPI = {
  topPicks: (assetType = 'all', limit = 20) =>
    api.get(`/invest/top-picks?asset_type=${assetType}&limit=${limit}`),
  analyze: (symbol: string, assetType = 'stock') =>
    api.get(`/invest/analyze/${symbol}?asset_type=${assetType}`),
  profitCalc: (symbol: string, assetType: string, amount: number) =>
    api.get(`/invest/profit-calc?symbol=${symbol}&asset_type=${assetType}&investment_amount=${amount}`),
  marketPulse: () => api.get('/invest/market-pulse'),
  compare: (symbols: string) => api.get(`/invest/compare?symbols=${symbols}`),
  whenToBuy: (symbol: string, assetType = 'stock') =>
    api.get(`/invest/when-to-buy/${symbol}?asset_type=${assetType}`),
  whenToSell: (symbol: string, assetType = 'stock') =>
    api.get(`/invest/when-to-sell/${symbol}?asset_type=${assetType}`),
};

// WebSocket connection for real-time updates
export const createWebSocket = (onMessage: (data: any) => void): WebSocket => {
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/market/ws`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
};

export default api;
