import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Card, Text, Button, Avatar, Chip } from 'react-native-paper';
import { leaderboardService, LeaderboardEntry } from '../services/LeaderboardService';

export default function TraderDetailsScreen({ route }: any) {
  const { userId } = route.params;
  const [trader, setTrader] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    loadTraderDetails();
  }, [userId]);

  const loadTraderDetails = async () => {
    try {
      setLoading(true);
      const data = await leaderboardService.getTraderDetails(userId);
      setTrader(data);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error('Error loading trader details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!trader) return;

    try {
      if (isFollowing) {
        await leaderboardService.unfollowTrader(userId);
      } else {
        await leaderboardService.followTrader(userId);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (!trader) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Could not load trader details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Trader Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerContent}>
              <Avatar.Text
                size={80}
                label={trader.username.substring(0, 2).toUpperCase()}
                style={styles.avatar}
              />
              <View style={styles.traderInfo}>
                <Text style={styles.traderName}>{trader.username}</Text>
                <Chip
                  label={`Rank #${trader.rank}`}
                  style={styles.rankChip}
                  textStyle={{ color: '#fff', fontSize: 12 }}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Performance Metrics */}
        <Card style={styles.card}>
          <Card.Title title="Performance" />
          <Card.Content>
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>
                  {trader.returnPercent >= 0 ? '+' : ''}
                  {trader.returnPercent.toFixed(2)}%
                </Text>
                <Text style={styles.metricLabel}>Return</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>${trader.totalGainLoss.toFixed(0)}</Text>
                <Text style={styles.metricLabel}>Gain/Loss</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{trader.accuracy.toFixed(1)}%</Text>
                <Text style={styles.metricLabel}>Accuracy</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Portfolio Info */}
        <Card style={styles.card}>
          <Card.Title title="Portfolio" />
          <Card.Content>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Value</Text>
              <Text style={styles.detailValue}>${trader.portfolioValue.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Trades</Text>
              <Text style={styles.detailValue}>{trader.tradeCount}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Followers</Text>
              <Text style={styles.detailValue}>{trader.followers}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Statistics */}
        <Card style={styles.card}>
          <Card.Title title="Statistics" />
          <Card.Content>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Win Rate</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${trader.accuracy}%` },
                  ]}
                />
              </View>
              <Text style={styles.statValue}>{trader.accuracy.toFixed(1)}%</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Action Button */}
        <Button
          mode={isFollowing ? 'outlined' : 'contained'}
          onPress={handleFollowToggle}
          style={styles.followButton}
          contentStyle={styles.buttonContent}
          icon={isFollowing ? 'check' : 'plus'}
        >
          {isFollowing ? 'Following' : 'Follow Trader'}
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
  headerCard: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
    backgroundColor: '#6200ee',
  },
  traderInfo: {
    flex: 1,
  },
  traderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  rankChip: {
    backgroundColor: '#6200ee',
    alignSelf: 'flex-start',
  },
  card: {
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statItem: {
    marginVertical: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  followButton: {
    marginTop: 24,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  errorText: {
    textAlign: 'center',
    color: '#cf6679',
    marginTop: 20,
  },
});
