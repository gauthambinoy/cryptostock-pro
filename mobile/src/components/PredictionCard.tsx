import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, ProgressBar } from 'react-native-paper';
import { Prediction } from '../services/PredictionService';

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const isPositive = prediction.predictedChangePercent >= 0;
  const confidenceColor =
    prediction.confidence >= 80
      ? '#4caf50'
      : prediction.confidence >= 60
        ? '#ff9800'
        : '#f44336';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.symbolSection}>
          <Text style={styles.symbol}>{prediction.symbol}</Text>
          <Text style={styles.timeframe}>{prediction.timeframe}</Text>
        </View>
        <Chip
          label={`${isPositive ? '+' : ''}${prediction.predictedChangePercent.toFixed(2)}%`}
          style={{
            backgroundColor: isPositive ? '#4caf50' : '#cf6679',
          }}
          textStyle={{ color: '#fff' }}
        />
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.label}>Current</Text>
          <Text style={styles.price}>${prediction.currentPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.arrow}>
          <Text style={{ fontSize: 20, color: isPositive ? '#4caf50' : '#cf6679' }}>
            {isPositive ? '→' : '→'}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.label}>Predicted</Text>
          <Text style={styles.price}>${prediction.predictedPrice.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.confidenceSection}>
          <View style={styles.confidenceLabel}>
            <Text style={styles.label}>Confidence</Text>
            <Text style={[styles.confidence, { color: confidenceColor }]}>
              {prediction.confidence.toFixed(0)}%
            </Text>
          </View>
          <ProgressBar
            progress={prediction.confidence / 100}
            color={confidenceColor}
            style={styles.progressBar}
          />
        </View>
        <View style={styles.accuracySection}>
          <Text style={styles.label}>Accuracy</Text>
          <Text style={styles.accuracy}>{prediction.accuracy.toFixed(1)}%</Text>
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
    borderLeftColor: '#ff9800',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  symbolSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  timeframe: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  arrow: {
    marginHorizontal: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceSection: {
    flex: 1,
    marginRight: 16,
  },
  confidenceLabel: {
    marginBottom: 6,
  },
  confidence: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  accuracySection: {
    alignItems: 'center',
  },
  accuracy: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200ee',
  },
});
