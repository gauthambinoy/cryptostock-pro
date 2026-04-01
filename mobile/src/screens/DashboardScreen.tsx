import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Card, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { portfolioService, Portfolio } from '../services/PortfolioService';
import { predictionService, PredictionStats } from '../services/PredictionService';
import { alertService, Alert } from '../services/AlertService';
import { cacheService } from '../services/CacheService';
import PriceCard from '../components/PriceCard';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }: any) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const { user } = useAuth();

  useEffect(() => {
    if (isFocused) {
      loadDashboardData();
    }
  }, [isFocused]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPortfolio(),
        loadPredictionStats(),
        loadAlerts(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      const cached = await cacheService.getPortfolioCache();
      const timestamp = await cacheService.getCacheTimestamp('portfolio');

      if (cached && !cacheService.isCacheExpired(timestamp)) {
        setPortfolio(cached);
        return;
      }

      const data = await portfolioService.getPortfolio();
      await cacheService.setPortfolioCache(data);
      await cacheService.setCacheTimestamp('portfolio');
      setPortfolio(data);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  };

  const loadPredictionStats = async () => {
    try {
      const data = await predictionService.getPredictionStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await alertService.getUnreadAlerts();
      setAlerts(data.slice(0, 5));
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData().finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />
      }
    >
      <View style={styles.content}>
        {/* Welcome Section */}
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Text style={styles.welcomeText}>Welcome back, {user?.name?.split(' ')[0]}!</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </Card.Content>
        </Card>

        {/* Portfolio Overview */}
        {portfolio && (
          <Card style={styles.portfolioCard}>
            <Card.Title title="Portfolio Overview" />
            <Card.Content>
              <View style={styles.portfolioMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Total Value</Text>
                  <Text style={styles.metricValue}>
                    ${portfolio.totalValue?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Gain/Loss</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: (portfolio.totalGainLoss || 0) >= 0 ? '#4caf50' : '#cf6679',
                      },
                    ]}
                  >
                    {portfolio.totalGainLoss ? (portfolio.totalGainLoss >= 0 ? '+' : '') : '+'}
                    {portfolio.totalGainLoss?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Return %</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: (portfolio.gainLossPercent || 0) >= 0 ? '#4caf50' : '#cf6679',
                      },
                    ]}
                  >
                    {portfolio.gainLossPercent ? (portfolio.gainLossPercent >= 0 ? '+' : '') : '+'}
                    {portfolio.gainLossPercent?.toFixed(2) || '0.00'}%
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Top Holdings */}
        {portfolio && portfolio.holdings.length > 0 && (
          <Card style={styles.card}>
            <Card.Title title="Top Holdings" subtitle={`${portfolio.holdings.length} assets`} />
            <Card.Content>
              {portfolio.holdings.slice(0, 3).map((holding) => (
                <PriceCard key={holding.symbol} holding={holding} />
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Prediction Stats */}
        {stats && (
          <Card style={styles.card}>
            <Card.Title title="Prediction Performance" />
            <Card.Content>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.accuracy.toFixed(1)}%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.totalPredictions}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.correctPredictions}</Text>
                  <Text style={styles.statLabel}>Correct</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.avgConfidence.toFixed(1)}%</Text>
                  <Text style={styles.statLabel}>Avg Confidence</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <Card style={styles.card}>
            <Card.Title title="Recent Alerts" />
            <Card.Content>
              {alerts.map((alert) => (
                <View key={alert.id} style={styles.alertItem}>
                  <View style={styles.alertContent}>
                    <Chip
                      label={alert.type.toUpperCase()}
                      style={[
                        styles.alertChip,
                        {
                          backgroundColor:
                            alert.type === 'price'
                              ? '#2196f3'
                              : alert.type === 'prediction'
                                ? '#ff9800'
                                : '#4caf50',
                        },
                      ]}
                      textStyle={{ color: '#fff' }}
                    />
                    <Text style={styles.alertSymbol}>{alert.symbol}</Text>
                  </View>
                  <Text style={styles.alertCondition}>{alert.condition}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
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
  welcomeCard: {
    marginBottom: 16,
    backgroundColor: '#6200ee',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateText: {
    color: '#e8daf5',
    marginTop: 4,
  },
  portfolioCard: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  portfolioMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  alertItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertChip: {
    height: 24,
    marginRight: 8,
  },
  alertSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  alertCondition: {
    fontSize: 12,
    color: '#666',
    marginLeft: 24,
  },
});
