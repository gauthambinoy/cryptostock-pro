import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-svg-charts';
import { Text } from 'react-native-paper';
import { Holding } from '../services/PortfolioService';

interface PortfolioChartProps {
  holdings: Holding[];
}

export default function PortfolioChart({ holdings }: PortfolioChartProps) {
  const chartData = useMemo(() => {
    const colors = [
      '#6200ee',
      '#2196f3',
      '#00bcd4',
      '#4caf50',
      '#ff9800',
      '#f44336',
      '#9c27b0',
      '#e91e63',
    ];

    return holdings.map((h, idx) => ({
      value: h.allocation,
      svg: {
        fill: colors[idx % colors.length],
      },
      key: h.symbol,
    }));
  }, [holdings]);

  const windowWidth = Dimensions.get('window').width;
  const chartSize = windowWidth - 100;

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <PieChart
          style={{ height: 250, width: chartSize }}
          data={chartData}
          innerRadius="50%"
        />
      </View>

      <View style={styles.legend}>
        {holdings.map((holding, idx) => (
          <View key={holding.symbol} style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                {
                  backgroundColor: [
                    '#6200ee',
                    '#2196f3',
                    '#00bcd4',
                    '#4caf50',
                    '#ff9800',
                    '#f44336',
                    '#9c27b0',
                    '#e91e63',
                  ][idx % 8],
                },
              ]}
            />
            <Text style={styles.legendLabel}>{holding.symbol}</Text>
            <Text style={styles.legendValue}>{holding.allocation.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  legend: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
  },
  legendValue: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});
