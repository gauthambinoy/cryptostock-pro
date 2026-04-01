import AsyncStorage from '@react-native-async-storage/async-storage';

export const cacheService = {
  async getPortfolioCache() {
    try {
      const data = await AsyncStorage.getItem('portfolio_cache');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting portfolio cache:', error);
      return null;
    }
  },

  async setPortfolioCache(data: any) {
    try {
      await AsyncStorage.setItem('portfolio_cache', JSON.stringify(data));
    } catch (error) {
      console.error('Error setting portfolio cache:', error);
    }
  },

  async getPredictionsCache() {
    try {
      const data = await AsyncStorage.getItem('predictions_cache');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting predictions cache:', error);
      return null;
    }
  },

  async setPredictionsCache(data: any) {
    try {
      await AsyncStorage.setItem('predictions_cache', JSON.stringify(data));
    } catch (error) {
      console.error('Error setting predictions cache:', error);
    }
  },

  async getAlertsCache() {
    try {
      const data = await AsyncStorage.getItem('alerts_cache');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting alerts cache:', error);
      return null;
    }
  },

  async setAlertsCache(data: any) {
    try {
      await AsyncStorage.setItem('alerts_cache', JSON.stringify(data));
    } catch (error) {
      console.error('Error setting alerts cache:', error);
    }
  },

  async getLeaderboardCache() {
    try {
      const data = await AsyncStorage.getItem('leaderboard_cache');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting leaderboard cache:', error);
      return null;
    }
  },

  async setLeaderboardCache(data: any) {
    try {
      await AsyncStorage.setItem('leaderboard_cache', JSON.stringify(data));
    } catch (error) {
      console.error('Error setting leaderboard cache:', error);
    }
  },

  async clearAllCache() {
    try {
      await AsyncStorage.multiRemove([
        'portfolio_cache',
        'predictions_cache',
        'alerts_cache',
        'leaderboard_cache',
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  async getCacheTimestamp(key: string) {
    try {
      const timestamp = await AsyncStorage.getItem(`${key}_timestamp`);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Error getting cache timestamp:', error);
      return null;
    }
  },

  async setCacheTimestamp(key: string) {
    try {
      await AsyncStorage.setItem(`${key}_timestamp`, Date.now().toString());
    } catch (error) {
      console.error('Error setting cache timestamp:', error);
    }
  },

  isCacheExpired(timestamp: number | null, expiryMs: number = 5 * 60 * 1000): boolean {
    if (!timestamp) return true;
    return Date.now() - timestamp > expiryMs;
  },
};
