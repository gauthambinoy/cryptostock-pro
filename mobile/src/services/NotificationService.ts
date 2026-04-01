import * as Notifications from 'expo-notifications';
import { authService } from './AuthService';

const apiClient = authService.getApiClient();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationSettings {
  priceAlerts: boolean;
  predictionAlerts: boolean;
  newsAlerts: boolean;
  portfolioUpdates: boolean;
  leaderboardUpdates: boolean;
  pushEnabled: boolean;
}

export const notificationService = {
  async registerForPushNotifications() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  },

  async savePushToken(token: string) {
    try {
      await apiClient.post('/notifications/register-token', { token });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const response = await apiClient.get('/notifications/settings');
      return response.data.settings;
    } catch (error) {
      throw new Error('Failed to fetch notification settings');
    }
  },

  async updateNotificationSettings(settings: Partial<NotificationSettings>) {
    try {
      const response = await apiClient.put('/notifications/settings', settings);
      return response.data.settings;
    } catch (error) {
      throw new Error('Failed to update notification settings');
    }
  },

  async getNotificationHistory(limit: number = 50) {
    try {
      const response = await apiClient.get(`/notifications/history?limit=${limit}`);
      return response.data.notifications;
    } catch (error) {
      throw new Error('Failed to fetch notification history');
    }
  },

  async markNotificationAsRead(notificationId: string) {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  async deleteNotification(notificationId: string) {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  async setupNotificationListeners() {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('Notification received:', data);
      }
    );

    return subscription;
  },

  async sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        badge: 1,
      },
      trigger: { seconds: 2 },
    });
  },
};
