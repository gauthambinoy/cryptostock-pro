import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Alert } from '../services/AlertService';

interface AlertBadgeProps {
  alert: Alert;
}

export default function AlertBadge({ alert }: AlertBadgeProps) {
  if (!alert.triggered) {
    return (
      <Chip
        label="Waiting"
        style={styles.waitingBadge}
        textStyle={styles.badgeText}
      />
    );
  }

  return (
    <Chip
      label="Triggered!"
      style={styles.triggeredBadge}
      textStyle={styles.triggeredText}
      icon="check-circle"
    />
  );
}

const styles = StyleSheet.create({
  waitingBadge: {
    backgroundColor: '#e3f2fd',
  },
  triggeredBadge: {
    backgroundColor: '#c8e6c9',
  },
  badgeText: {
    color: '#1976d2',
    fontSize: 11,
  },
  triggeredText: {
    color: '#2e7d32',
    fontSize: 11,
  },
});
