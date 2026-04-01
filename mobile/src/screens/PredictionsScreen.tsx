import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Card, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { predictionService, Prediction } from '../services/PredictionService';
import { cacheService } from '../services/CacheService';
import PredictionCard from '../components/PredictionCard';

export default function PredictionsScreen() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accuracy, setAccuracy] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      loadPredictions();
    }, [])
  );

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const cached = await cacheService.getPredictionsCache();
      const timestamp = await cacheService.getCacheTimestamp('predictions');

      if (cached && !cacheService.isCacheExpired(timestamp)) {
        setPredictions(cached);
      } else {
        const data = await predictionService.getTopPredictions(20);
        setPredictions(data);
        await cacheService.setPredictionsCache(data);
        await cacheService.setCacheTimestamp('predictions');
      }

      const stats = await predictionService.getPredictionStats();
      setAccuracy(stats.accuracy);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPredictions().finally(() => setRefreshing(false));
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
        {/* Accuracy Card */}
        <Card style={styles.accuracyCard}>
          <Card.Content>
            <View style={styles.accuracyContainer}>
              <View>
                <Text style={styles.accuracyLabel}>Overall Accuracy</Text>
                <Text style={styles.accuracyValue}>{accuracy.toFixed(1)}%</Text>
              </View>
              <Chip
                label={accuracy >= 60 ? 'Strong' : accuracy >= 50 ? 'Good' : 'Fair'}
                style={{
                  backgroundColor:
                    accuracy >= 60 ? '#4caf50' : accuracy >= 50 ? '#ff9800' : '#f44336',
                }}
                textStyle={{ color: '#fff' }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Predictions List */}
        <Card style={styles.card}>
          <Card.Title
            title="Top Predictions"
            subtitle={`${predictions.length} active predictions`}
          />
          <Card.Content>
            {predictions.length > 0 ? (
              predictions.map((prediction) => (
                <PredictionCard key={prediction.id} prediction={prediction} />
              ))
            ) : (
              <Text style={styles.emptyText}>No predictions available</Text>
            )}
          </Card.Content>
        </Card>

        {/* Prediction Categories */}
        <Card style={styles.card}>
          <Card.Title title="Prediction Distribution" />
          <Card.Content>
            <View style={styles.distributionGrid}>
              <View style={styles.distBox}>
                <Text style={styles.distValue}>
                  {predictions.filter((p) => parseFloat(p.predictedChangePercent.toString()) > 0)
                    .length}
                </Text>
                <Text style={styles.distLabel}>Bullish</Text>
              </View>
              <View style={styles.distBox}>
                <Text style={styles.distValue}>
                  {predictions.filter((p) => parseFloat(p.predictedChangePercent.toString()) < 0)
                    .length}
                </Text>
                <Text style={styles.distLabel}>Bearish</Text>
              </View>
              <View style={styles.distBox}>
                <Text style={styles.distValue}>
                  {(predictions.reduce((sum, p) => sum + p.confidence, 0) / Math.max(predictions.length, 1)).toFixed(0)}
                </Text>
                <Text style={styles.distLabel}>Avg Confidence</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* High Confidence Predictions */}
        {predictions.some((p) => p.confidence >= 80) && (
          <Card style={styles.card}>
            <Card.Title title="High Confidence Picks" subtitle="≥80% confidence" />
            <Card.Content>
              {predictions
                .filter((p) => p.confidence >= 80)
                .map((prediction) => (
                  <PredictionCard key={prediction.id} prediction={prediction} />
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
  card: {
    marginBottom: 16,
  },
  accuracyCard: {
    marginBottom: 16,
    backgroundColor: '#e8f5e9',
  },
  accuracyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accuracyLabel: {
    fontSize: 12,
    color: '#666',
  },
  accuracyValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  distributionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  distBox: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  distValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  distLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
