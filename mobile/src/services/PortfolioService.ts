import { authService } from './AuthService';

const apiClient = authService.getApiClient();

export interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
  allocation: number;
}

export interface Portfolio {
  id: string;
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  gainLossPercent: number;
  holdings: Holding[];
  updatedAt: string;
}

export const portfolioService = {
  async getPortfolio(): Promise<Portfolio> {
    try {
      const response = await apiClient.get('/portfolio');
      return response.data.portfolio;
    } catch (error) {
      throw new Error('Failed to fetch portfolio');
    }
  },

  async getPortfolioHoldings(): Promise<Holding[]> {
    try {
      const response = await apiClient.get('/portfolio/holdings');
      return response.data.holdings;
    } catch (error) {
      throw new Error('Failed to fetch holdings');
    }
  },

  async getHoldingDetails(symbol: string): Promise<Holding> {
    try {
      const response = await apiClient.get(`/portfolio/holdings/${symbol}`);
      return response.data.holding;
    } catch (error) {
      throw new Error('Failed to fetch holding details');
    }
  },

  async addHolding(symbol: string, quantity: number, price: number) {
    try {
      const response = await apiClient.post('/portfolio/holdings', {
        symbol,
        quantity,
        price,
      });
      return response.data.holding;
    } catch (error) {
      throw new Error('Failed to add holding');
    }
  },

  async updateHolding(symbol: string, quantity: number) {
    try {
      const response = await apiClient.put(`/portfolio/holdings/${symbol}`, { quantity });
      return response.data.holding;
    } catch (error) {
      throw new Error('Failed to update holding');
    }
  },

  async deleteHolding(symbol: string) {
    try {
      await apiClient.delete(`/portfolio/holdings/${symbol}`);
    } catch (error) {
      throw new Error('Failed to delete holding');
    }
  },

  async getPortfolioHistory(days: number = 30) {
    try {
      const response = await apiClient.get(`/portfolio/history?days=${days}`);
      return response.data.history;
    } catch (error) {
      throw new Error('Failed to fetch portfolio history');
    }
  },

  async getAssetAllocation() {
    try {
      const response = await apiClient.get('/portfolio/allocation');
      return response.data.allocation;
    } catch (error) {
      throw new Error('Failed to fetch asset allocation');
    }
  },

  async rebalancePortfolio(targetAllocation: { [symbol: string]: number }) {
    try {
      const response = await apiClient.post('/portfolio/rebalance', { targetAllocation });
      return response.data.portfolio;
    } catch (error) {
      throw new Error('Failed to rebalance portfolio');
    }
  },
};
