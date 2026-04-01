import { authService } from './AuthService';

const apiClient = authService.getApiClient();

export interface Alert {
  id: string;
  symbol: string;
  type: 'price' | 'prediction' | 'milestone' | 'news';
  condition: string;
  value: number;
  isActive: boolean;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const alertService = {
  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await apiClient.get('/alerts');
      return response.data.alerts;
    } catch (error) {
      throw new Error('Failed to fetch alerts');
    }
  },

  async getUnreadAlerts(): Promise<Alert[]> {
    try {
      const response = await apiClient.get('/alerts/unread');
      return response.data.alerts;
    } catch (error) {
      throw new Error('Failed to fetch unread alerts');
    }
  },

  async createAlert(symbol: string, type: string, condition: string, value: number) {
    try {
      const response = await apiClient.post('/alerts', {
        symbol,
        type,
        condition,
        value,
      });
      return response.data.alert;
    } catch (error) {
      throw new Error('Failed to create alert');
    }
  },

  async updateAlert(alertId: string, data: Partial<Alert>) {
    try {
      const response = await apiClient.put(`/alerts/${alertId}`, data);
      return response.data.alert;
    } catch (error) {
      throw new Error('Failed to update alert');
    }
  },

  async deleteAlert(alertId: string) {
    try {
      await apiClient.delete(`/alerts/${alertId}`);
    } catch (error) {
      throw new Error('Failed to delete alert');
    }
  },

  async toggleAlert(alertId: string, isActive: boolean) {
    try {
      const response = await apiClient.put(`/alerts/${alertId}/toggle`, { isActive });
      return response.data.alert;
    } catch (error) {
      throw new Error('Failed to toggle alert');
    }
  },

  async markAsRead(alertId: string) {
    try {
      await apiClient.put(`/alerts/${alertId}/read`);
    } catch (error) {
      throw new Error('Failed to mark alert as read');
    }
  },

  async markAllAsRead() {
    try {
      await apiClient.post('/alerts/mark-all-read');
    } catch (error) {
      throw new Error('Failed to mark all alerts as read');
    }
  },

  async getAlertHistory(days: number = 30): Promise<Alert[]> {
    try {
      const response = await apiClient.get(`/alerts/history?days=${days}`);
      return response.data.alerts;
    } catch (error) {
      throw new Error('Failed to fetch alert history');
    }
  },
};
