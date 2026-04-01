import { authService } from './AuthService';

const apiClient = authService.getApiClient();

export interface Prediction {
  id: string;
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  predictedChange: number;
  predictedChangePercent: number;
  confidence: number;
  timeframe: string;
  accuracy: number;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionStats {
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  avgConfidence: number;
}

export const predictionService = {
  async getTopPredictions(limit: number = 10): Promise<Prediction[]> {
    try {
      const response = await apiClient.get(`/predictions/top?limit=${limit}`);
      return response.data.predictions;
    } catch (error) {
      throw new Error('Failed to fetch predictions');
    }
  },

  async getPredictionBySymbol(symbol: string): Promise<Prediction> {
    try {
      const response = await apiClient.get(`/predictions/${symbol}`);
      return response.data.prediction;
    } catch (error) {
      throw new Error('Failed to fetch prediction');
    }
  },

  async getPredictionHistory(symbol: string): Promise<Prediction[]> {
    try {
      const response = await apiClient.get(`/predictions/${symbol}/history`);
      return response.data.predictions;
    } catch (error) {
      throw new Error('Failed to fetch prediction history');
    }
  },

  async getPredictionStats(): Promise<PredictionStats> {
    try {
      const response = await apiClient.get('/predictions/stats');
      return response.data.stats;
    } catch (error) {
      throw new Error('Failed to fetch prediction stats');
    }
  },

  async getAccuracyMetrics(timeframe: string = 'month'): Promise<any> {
    try {
      const response = await apiClient.get(`/predictions/accuracy?timeframe=${timeframe}`);
      return response.data.metrics;
    } catch (error) {
      throw new Error('Failed to fetch accuracy metrics');
    }
  },

  async getPredictionsForPortfolio(): Promise<Prediction[]> {
    try {
      const response = await apiClient.get('/predictions/portfolio');
      return response.data.predictions;
    } catch (error) {
      throw new Error('Failed to fetch portfolio predictions');
    }
  },
};
