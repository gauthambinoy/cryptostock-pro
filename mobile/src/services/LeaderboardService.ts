import { authService } from './AuthService';

const apiClient = authService.getApiClient();

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  returnPercent: number;
  totalGainLoss: number;
  portfolioValue: number;
  tradeCount: number;
  accuracy: number;
  followers: number;
  isFollowing: boolean;
}

export interface LeaderboardStats {
  userRank: number;
  userReturnPercent: number;
  topPredictions: number;
  monthlyGainLoss: number;
}

export const leaderboardService = {
  async getTopTraders(limit: number = 20, timeframe: string = 'month'): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get(`/leaderboard/top?limit=${limit}&timeframe=${timeframe}`);
      return response.data.traders;
    } catch (error) {
      throw new Error('Failed to fetch leaderboard');
    }
  },

  async getLeaderboardStats(): Promise<LeaderboardStats> {
    try {
      const response = await apiClient.get('/leaderboard/stats');
      return response.data.stats;
    } catch (error) {
      throw new Error('Failed to fetch leaderboard stats');
    }
  },

  async getTraderDetails(userId: string): Promise<LeaderboardEntry> {
    try {
      const response = await apiClient.get(`/leaderboard/trader/${userId}`);
      return response.data.trader;
    } catch (error) {
      throw new Error('Failed to fetch trader details');
    }
  },

  async followTrader(userId: string) {
    try {
      const response = await apiClient.post(`/leaderboard/follow/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to follow trader');
    }
  },

  async unfollowTrader(userId: string) {
    try {
      await apiClient.post(`/leaderboard/unfollow/${userId}`);
    } catch (error) {
      throw new Error('Failed to unfollow trader');
    }
  },

  async getFollowedTraders(): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get('/leaderboard/followed');
      return response.data.traders;
    } catch (error) {
      throw new Error('Failed to fetch followed traders');
    }
  },

  async getTraderPortfolio(userId: string) {
    try {
      const response = await apiClient.get(`/leaderboard/trader/${userId}/portfolio`);
      return response.data.portfolio;
    } catch (error) {
      throw new Error('Failed to fetch trader portfolio');
    }
  },

  async getTraderPredictions(userId: string) {
    try {
      const response = await apiClient.get(`/leaderboard/trader/${userId}/predictions`);
      return response.data.predictions;
    } catch (error) {
      throw new Error('Failed to fetch trader predictions');
    }
  },

  async searchTraders(query: string): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get(`/leaderboard/search?q=${query}`);
      return response.data.traders;
    } catch (error) {
      throw new Error('Failed to search traders');
    }
  },
};
