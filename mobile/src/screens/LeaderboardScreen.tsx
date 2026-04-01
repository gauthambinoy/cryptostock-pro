import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Card, Text, ActivityIndicator, Chip, Avatar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { leaderboardService, LeaderboardEntry } from '../services/LeaderboardService';
import { cacheService } from '../services/CacheService';

export default function LeaderboardScreen({ navigation }: any) {
  const [traders, setTraders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [timeframe])
  );

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const cached = await cacheService.getLeaderboardCache();
      const timestamp = await cacheService.getCacheTimestamp('leaderboard');

      if (cached && !cacheService.isCacheExpired(timestamp, 10 * 60 * 1000)) {
        setTraders(cached);
        return;
      }

      const data = await leaderboardService.getTopTraders(50, timeframe);
      setTraders(data);
      await cacheService.setLeaderboardCache(data);
      await cacheService.setCacheTimestamp('leaderboard');
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLeaderboard().finally(() => setRefreshing(false));
  }, []);

  const handleTraderPress = (trader: LeaderboardEntry) => {
    navigation.navigate('TraderDetails', {
      userId: trader.userId,
      traderName: trader.username,
    });
  };

  if (loading && traders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.headerContainer}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {(['week', 'month', 'year'] as const).map((tf) => (
          <Chip
            key={tf}
            selected={timeframe === tf}
            onPress={() => setTimeframe(tf)}
            style={styles.filterChip}
            mode={timeframe === tf ? 'flat' : 'outlined'}
          >
            {tf.charAt(0).toUpperCase() + tf.slice(1)}
          </Chip>
        ))}
      </ScrollView>

      <FlatList
        data={traders}
        keyExtractor={(item) => item.userId}
        renderItem={({ item, index }) => (
          <Card
            style={styles.traderCard}
            onPress={() => handleTraderPress(item)}
          >
            <Card.Content>
              <View style={styles.traderRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>

                <View style={styles.traderInfo}>
                  <Text style={styles.traderName}>{item.username}</Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statText}>
                      Return: {item.returnPercent.toFixed(2)}%
                    </Text>
                    <Text style={styles.statText}>
                      Accuracy: {item.accuracy.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.returnContainer}>
                  <Text
                    style={[
                      styles.returnValue,
                      {
                        color: item.returnPercent >= 0 ? '#4caf50' : '#cf6679',
                      },
                    ]}
                  >
                    {item.returnPercent >= 0 ? '+' : ''}
                    {item.returnPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailValue}>${item.portfolioValue.toFixed(0)}</Text>
                  <Text style={styles.detailLabel}>Portfolio</Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailValue}>{item.tradeCount}</Text>
                  <Text style={styles.detailLabel}>Trades</Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailValue}>{item.followers}</Text>
                  <Text style={styles.detailLabel}>Followers</Text>
                </View>
              </View>

              {item.isFollowing && (
                <Chip
                  label="Following"
                  style={styles.followingChip}
                  textStyle={{ color: '#fff' }}
                  icon="check"
                />
              )}
            </Card.Content>
          </Card>
        )}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No traders found</Text>
          </View>
        }
      />
    </View>
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
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 80,
  },
  traderCard: {
    marginBottom: 12,
  },
  traderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  traderInfo: {
    flex: 1,
  },
  traderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  returnContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  returnValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  detailBox: {
    alignItems: 'center',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  detailLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  followingChip: {
    backgroundColor: '#4caf50',
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});
