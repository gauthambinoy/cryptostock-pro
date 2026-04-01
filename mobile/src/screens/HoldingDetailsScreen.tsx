import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { portfolioService, Holding } from '../services/PortfolioService';

export default function HoldingDetailsScreen({ route }: any) {
  const { symbol } = route.params;
  const [holding, setHolding] = useState<Holding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHoldingDetails();
  }, [symbol]);

  const loadHoldingDetails = async () => {
    try {
      setLoading(true);
      const data = await portfolioService.getHoldingDetails(symbol);
      setHolding(data);
    } catch (error) {
      console.error('Error loading holding details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (!holding) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Could not load holding details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.symbol}>{holding.symbol}</Text>
            <Text style={styles.currentPrice}>
              ${holding.currentPrice.toFixed(2)}
            </Text>
            <Text
              style={[
                styles.priceChange,
                {
                  color: (holding.gainLoss || 0) >= 0 ? '#4caf50' : '#cf6679',
                },
              ]}
            >
              {holding.gainLoss ? (holding.gainLoss >= 0 ? '+' : '') : '+'}
              {holding.gainLoss?.toFixed(2)} ({holding.gainLossPercent?.toFixed(2)}%)
            </Text>
          </Card.Content>
        </Card>

        {/* Position Details */}
        <Card style={styles.card}>
          <Card.Title title="Position Details" />
          <Card.Content>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>{holding.quantity.toFixed(4)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Average Entry Price</Text>
              <Text style={styles.detailValue}>${holding.averagePrice.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Price</Text>
              <Text style={styles.detailValue}>${holding.currentPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Value</Text>
              <Text style={styles.detailValue}>${holding.totalValue.toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Performance */}
        <Card style={styles.card}>
          <Card.Title title="Performance" />
          <Card.Content>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Gain/Loss</Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: (holding.gainLoss || 0) >= 0 ? '#4caf50' : '#cf6679',
                  },
                ]}
              >
                {holding.gainLoss ? (holding.gainLoss >= 0 ? '+' : '') : '+'}
                {holding.gainLoss?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gain/Loss %</Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: (holding.gainLossPercent || 0) >= 0 ? '#4caf50' : '#cf6679',
                  },
                ]}
              >
                {holding.gainLossPercent ? (holding.gainLossPercent >= 0 ? '+' : '') : '+'}
                {holding.gainLossPercent?.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Portfolio Allocation</Text>
              <Text style={styles.detailValue}>{holding.allocation.toFixed(2)}%</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Actions */}
        <View style={styles.actionButtons}>
          <Button mode="outlined" style={styles.button}>
            Sell All
          </Button>
          <Button mode="contained" style={styles.button}>
            Add More
          </Button>
        </View>
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
    backgroundColor: '#6200ee',
  },
  symbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  priceChange: {
    fontSize: 18,
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  errorText: {
    textAlign: 'center',
    color: '#cf6679',
    marginTop: 20,
  },
});
