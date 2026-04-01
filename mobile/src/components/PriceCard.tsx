import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { Holding } from '../services/PortfolioService';

interface PriceCardProps {
  holding: Holding;
}

export default function PriceCard({ holding }: PriceCardProps) {
  const isPositive = holding.gainLossPercent >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.symbol}>{holding.symbol}</Text>
          <Text style={styles.quantity}>{holding.quantity.toFixed(4)} units</Text>
        </View>
        <View style={styles.priceSection}>
          <Text style={styles.currentPrice}>${holding.currentPrice.toFixed(2)}</Text>
          <Chip
            label={`${isPositive ? '+' : ''}${holding.gainLossPercent.toFixed(2)}%`}
            style={{
              backgroundColor: isPositive ? '#4caf50' : '#cf6679',
              marginTop: 4,
            }}
            textStyle={{ color: '#fff', fontSize: 11 }}
          />
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.label}>Value</Text>
          <Text style={styles.value}>${holding.totalValue.toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.label}>Gain/Loss</Text>
          <Text
            style={[
              styles.value,
              { color: isPositive ? '#4caf50' : '#cf6679' },
            ]}
          >
            {isPositive ? '+' : ''}${holding.gainLoss.toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.label}>Allocation</Text>
          <Text style={styles.value}>{holding.allocation.toFixed(1)}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});
