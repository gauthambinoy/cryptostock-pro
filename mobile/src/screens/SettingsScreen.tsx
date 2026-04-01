import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  Divider,
  Avatar,
  Paragraph,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notificationService, NotificationSettings } from '../services/NotificationService';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>({
    priceAlerts: true,
    predictionAlerts: true,
    newsAlerts: true,
    portfolioUpdates: true,
    leaderboardUpdates: false,
    pushEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    registerForPushNotifications();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotificationSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        await notificationService.savePushToken(token);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);

    try {
      await notificationService.updateNotificationSettings({ [key]: value });
    } catch (error) {
      console.error('Error updating settings:', error);
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={80}
                label={user?.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'U'}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Theme Settings */}
        <Card style={styles.card}>
          <Card.Title title="Appearance" />
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <MaterialCommunityIcons name="moon-waning-crescent" size={24} color="#6200ee" />
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                color="#6200ee"
              />
            </View>
          </Card.Content>
        </Card>

        {/* Notification Settings */}
        <Card style={styles.card}>
          <Card.Title title="Notifications" />
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <MaterialCommunityIcons name="bell" size={24} color="#6200ee" />
                <Text style={styles.settingText}>Push Notifications</Text>
              </View>
              <Switch
                value={settings.pushEnabled}
                onValueChange={(value) => updateSetting('pushEnabled', value)}
                color="#6200ee"
                disabled={saving}
              />
            </View>
            <Divider style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <MaterialCommunityIcons name="currency-usd" size={24} color="#2196f3" />
                <Text style={styles.settingText}>Price Alerts</Text>
              </View>
              <Switch
                value={settings.priceAlerts}
                onValueChange={(value) => updateSetting('priceAlerts', value)}
                color="#2196f3"
                disabled={saving || !settings.pushEnabled}
              />
            </View>
            <Divider style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <MaterialCommunityIcons name="trending-up" size={24} color="#ff9800" />
                <Text style={styles.settingText}>Prediction Alerts</Text>
              </View>
              <Switch
                value={settings.predictionAlerts}
                onValueChange={(value) => updateSetting('predictionAlerts', value)}
                color="#ff9800"
                disabled={saving || !settings.pushEnabled}
              />
            </View>
            <Divider style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <MaterialCommunityIcons name="newspaper" size={24} color="#4caf50" />
                <Text style={styles.settingText}>News Alerts</Text>
              </View>
              <Switch
                value={settings.newsAlerts}
                onValueChange={(value) => updateSetting('newsAlerts', value)}
                color="#4caf50"
                disabled={saving || !settings.pushEnabled}
              />
            </View>
            <Divider style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <MaterialCommunityIcons name="chart-line" size={24} color="#673ab7" />
                <Text style={styles.settingText}>Portfolio Updates</Text>
              </View>
              <Switch
                value={settings.portfolioUpdates}
                onValueChange={(value) => updateSetting('portfolioUpdates', value)}
                color="#673ab7"
                disabled={saving || !settings.pushEnabled}
              />
            </View>
            <Divider style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLabel}>
                <MaterialCommunityIcons name="podium" size={24} color="#e91e63" />
                <Text style={styles.settingText}>Leaderboard Updates</Text>
              </View>
              <Switch
                value={settings.leaderboardUpdates}
                onValueChange={(value) => updateSetting('leaderboardUpdates', value)}
                color="#e91e63"
                disabled={saving || !settings.pushEnabled}
              />
            </View>
          </Card.Content>
        </Card>

        {/* App Info */}
        <Card style={styles.card}>
          <Card.Title title="About" />
          <Card.Content>
            <Paragraph>AssetPulse Mobile</Paragraph>
            <Paragraph>Version 1.0.0</Paragraph>
            <Paragraph style={styles.smallText}>
              Smart Investment Analytics on your mobile device
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          contentStyle={styles.buttonContent}
          color="#cf6679"
        >
          Sign Out
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 12,
    paddingBottom: 80,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
    backgroundColor: '#6200ee',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 14,
    marginLeft: 12,
    color: '#333',
  },
  divider: {
    marginVertical: 8,
  },
  smallText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 24,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
