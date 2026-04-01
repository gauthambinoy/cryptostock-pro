import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SectionList,
} from 'react-native';
import { Card, Text, ActivityIndicator, Chip, FAB, Dialog, Portal, Button, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { alertService, Alert } from '../services/AlertService';
import AlertBadge from '../components/AlertBadge';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [alertType, setAlertType] = useState('price');
  const [condition, setCondition] = useState('above');
  const [value, setValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [])
  );

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertService.getAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlerts().finally(() => setRefreshing(false));
  }, []);

  const handleCreateAlert = async () => {
    if (!symbol || !value) return;

    try {
      await alertService.createAlert(symbol, alertType, condition, parseFloat(value));
      setSymbol('');
      setAlertType('price');
      setCondition('above');
      setValue('');
      setDialogVisible(false);
      loadAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const handleToggleAlert = async (alertId: string, currentState: boolean) => {
    try {
      await alertService.toggleAlert(alertId, !currentState);
      loadAlerts();
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await alertService.deleteAlert(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  const activeAlerts = alerts.filter((a) => a.isActive);
  const inactiveAlerts = alerts.filter((a) => !a.isActive);

  const sections = [
    { title: 'Active', data: activeAlerts },
    { title: 'Inactive', data: inactiveAlerts },
  ];

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections.filter((s) => s.data.length > 0)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.alertCard}>
            <Card.Content>
              <View style={styles.alertHeader}>
                <View style={styles.alertInfo}>
                  <Text style={styles.symbolText}>{item.symbol}</Text>
                  <Chip
                    label={item.type.toUpperCase()}
                    style={{
                      backgroundColor:
                        item.type === 'price'
                          ? '#2196f3'
                          : item.type === 'prediction'
                            ? '#ff9800'
                            : '#4caf50',
                      marginVertical: 4,
                    }}
                    textStyle={{ color: '#fff', fontSize: 10 }}
                  />
                </View>
                <AlertBadge alert={item} />
              </View>
              <Text style={styles.conditionText}>
                {item.condition} ${item.value.toFixed(2)}
              </Text>
              {item.triggered && item.triggeredAt && (
                <Text style={styles.triggeredText}>
                  Triggered: {new Date(item.triggeredAt).toLocaleDateString()}
                </Text>
              )}
              <View style={styles.actionButtons}>
                <Button
                  mode={item.isActive ? 'contained' : 'outlined'}
                  onPress={() => handleToggleAlert(item.id, item.isActive)}
                  compact
                  size="small"
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleDeleteAlert(item.id)}
                  compact
                  size="small"
                  style={{ marginLeft: 8 }}
                >
                  Delete
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title} Alerts</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No alerts yet. Create one to get started!</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Create Alert Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Create Alert</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Symbol"
              value={symbol}
              onChangeText={setSymbol}
              placeholder="BTC, ETH, AAPL..."
              style={styles.dialogInput}
            />
            <TextInput
              label="Alert Type"
              value={alertType}
              onChangeText={setAlertType}
              placeholder="price, prediction, news..."
              style={styles.dialogInput}
            />
            <TextInput
              label="Condition"
              value={condition}
              onChangeText={setCondition}
              placeholder="above, below, equals..."
              style={styles.dialogInput}
            />
            <TextInput
              label="Value"
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateAlert} mode="contained">
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        onPress={() => setDialogVisible(true)}
        style={styles.fab}
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
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 80,
  },
  sectionHeader: {
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  alertCard: {
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertInfo: {
    flex: 1,
  },
  symbolText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  conditionText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  triggeredText: {
    fontSize: 12,
    color: '#f44336',
    marginVertical: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
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
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  dialogInput: {
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },
});
