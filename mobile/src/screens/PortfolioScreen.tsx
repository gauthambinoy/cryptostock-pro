import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Card, Text, ActivityIndicator, FAB, Dialog, Portal, Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { portfolioService, Holding } from '../services/PortfolioService';
import { cacheService } from '../services/CacheService';
import PriceCard from '../components/PriceCard';
import PortfolioChart from '../components/PortfolioChart';

export default function PortfolioScreen({ navigation }: any) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Holding | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHoldings();
    }, [])
  );

  const loadHoldings = async () => {
    setLoading(true);
    try {
      const cached = await cacheService.getPortfolioCache();
      const timestamp = await cacheService.getCacheTimestamp('portfolio');

      if (cached?.holdings && !cacheService.isCacheExpired(timestamp)) {
        setHoldings(cached.holdings);
        return;
      }

      const data = await portfolioService.getPortfolioHoldings();
      setHoldings(data);
    } catch (error) {
      console.error('Error loading holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHoldings().finally(() => setRefreshing(false));
  }, []);

  const handleHoldingPress = (holding: Holding) => {
    setSelectedAsset(holding);
    setDialogVisible(true);
  };

  const viewDetails = () => {
    if (selectedAsset) {
      navigation.navigate('HoldingDetails', { symbol: selectedAsset.symbol });
      setDialogVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />
        }
      >
        <View style={styles.content}>
          {/* Portfolio Chart */}
          {holdings.length > 0 && (
            <Card style={styles.card}>
              <Card.Title title="Asset Allocation" />
              <Card.Content>
                <PortfolioChart holdings={holdings} />
              </Card.Content>
            </Card>
          )}

          {/* Holdings Summary */}
          <Card style={styles.card}>
            <Card.Title
              title="Holdings"
              subtitle={`${holdings.length} assets • Total: $${totalValue.toFixed(2)}`}
            />
            <Card.Content>
              {holdings.length > 0 ? (
                holdings.map((holding) => (
                  <View
                    key={holding.symbol}
                    onTouchEnd={() => handleHoldingPress(holding)}
                    style={styles.holdingItem}
                  >
                    <PriceCard holding={holding} />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No holdings yet. Add your first asset!</Text>
              )}
            </Card.Content>
          </Card>

          {/* Performance Metrics */}
          {holdings.length > 0 && (
            <Card style={styles.card}>
              <Card.Title title="Performance" />
              <Card.Content>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Best Performer</Text>
                    <Text style={styles.metricValue}>
                      {holdings.reduce((max, h) => (h.gainLossPercent > max.gainLossPercent ? h : max)).symbol}
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Worst Performer</Text>
                    <Text style={styles.metricValue}>
                      {holdings.reduce((min, h) => (h.gainLossPercent < min.gainLossPercent ? h : min)).symbol}
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Largest Position</Text>
                    <Text style={styles.metricValue}>
                      {holdings.reduce((max, h) => (h.allocation > max.allocation ? h : max)).symbol}
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Diversity</Text>
                    <Text style={styles.metricValue}>{holdings.length} assets</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Asset Details Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{selectedAsset?.symbol}</Dialog.Title>
          <Dialog.Content>
            <View style={styles.dialogContent}>
              <View style={styles.dialogRow}>
                <Text>Quantity:</Text>
                <Text style={styles.dialogValue}>{selectedAsset?.quantity.toFixed(4)}</Text>
              </View>
              <View style={styles.dialogRow}>
                <Text>Current Price:</Text>
                <Text style={styles.dialogValue}>
                  ${selectedAsset?.currentPrice.toFixed(2)}
                </Text>
              </View>
              <View style={styles.dialogRow}>
                <Text>Total Value:</Text>
                <Text style={styles.dialogValue}>
                  ${selectedAsset?.totalValue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.dialogRow}>
                <Text>Gain/Loss:</Text>
                <Text
                  style={[
                    styles.dialogValue,
                    {
                      color: (selectedAsset?.gainLoss || 0) >= 0 ? '#4caf50' : '#cf6679',
                    },
                  ]}
                >
                  {selectedAsset?.gainLoss ? (selectedAsset.gainLoss >= 0 ? '+' : '') : '+'}
                  {selectedAsset?.gainLoss.toFixed(2)} ({selectedAsset?.gainLossPercent.toFixed(2)}%)
                </Text>
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Close</Button>
            <Button onPress={viewDetails} mode="contained">
              View Details
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  content: {
    padding: 12,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
  },
  holdingItem: {
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricBox: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  dialogContent: {
    paddingVertical: 8,
  },
  dialogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 6,
  },
  dialogValue: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
});
