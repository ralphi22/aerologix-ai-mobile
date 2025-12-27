import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAircraftStore } from '../../stores/aircraftStore';
import { useAuthStore } from '../../stores/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

// État de suivi par avion
interface TrackingState {
  [aircraftId: string]: {
    isActive: boolean;
    startTime: number | null;
    elapsedMinutes: number;
  };
}

export default function AircraftListScreen() {
  const router = useRouter();
  const { aircraft, isLoading, fetchAircraft, selectAircraft } = useAircraftStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAircraft();
  }, []);

  const loadAircraft = async () => {
    try {
      await fetchAircraft();
    } catch (error) {
      Alert.alert('Error', 'Failed to load aircraft');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAircraft();
    setRefreshing(false);
  };

  const handleAddAircraft = () => {
    if (!user) return;

    // Check aircraft limit
    if (user.limits.max_aircrafts !== -1 && aircraft.length >= user.limits.max_aircrafts) {
      Alert.alert(
        'Limit Reached',
        `Your ${user.subscription.plan} plan allows ${user.limits.max_aircrafts} aircraft(s). Upgrade your plan to add more.`,
        [{ text: 'OK' }]
      );
      return;
    }

    router.push('/aircraft/add');
  };

  const handleAircraftPress = (item: any) => {
    selectAircraft(item);
    router.push(`/aircraft/${item._id}`);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'BASIC':
        return '#94A3B8';
      case 'PILOT':
        return '#3B82F6';
      case 'MAINTENANCE_PRO':
        return '#8B5CF6';
      case 'FLEET_AI':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
  };

  const renderAircraftCard = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleAircraftPress(item)}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={item.photo_url ? { uri: item.photo_url } : require('../../assets/images/icon.png')}
        style={styles.cardBackground}
        imageStyle={styles.cardImage}
      >
        <LinearGradient
          colors={['rgba(30, 58, 138, 0.8)', 'rgba(30, 58, 138, 0.95)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.registration}>{item.registration}</Text>
              <Text style={styles.aircraftType}>
                {item.manufacturer} {item.model || item.aircraft_type}
              </Text>
            </View>
            {user && (
              <View
                style={[
                  styles.planBadge,
                  { backgroundColor: getPlanBadgeColor(user.subscription.plan) },
                ]}
              >
                <Text style={styles.planBadgeText}>{user.subscription.plan}</Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.hoursContainer}>
              <View style={styles.hoursItem}>
                <Ionicons name="speedometer-outline" size={16} color="#FFFFFF" />
                <Text style={styles.hoursLabel}>Airframe</Text>
                <Text style={styles.hoursValue}>{item.airframe_hours}h</Text>
              </View>
              <View style={styles.hoursItem}>
                <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
                <Text style={styles.hoursLabel}>Engine</Text>
                <Text style={styles.hoursValue}>{item.engine_hours}h</Text>
              </View>
              <View style={styles.hoursItem}>
                <Ionicons name="sync-outline" size={16} color="#FFFFFF" />
                <Text style={styles.hoursLabel}>Propeller</Text>
                <Text style={styles.hoursValue}>{item.propeller_hours}h</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="airplane-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Aircraft Yet</Text>
      <Text style={styles.emptyText}>Add your first aircraft to get started</Text>
    </View>
  );

  if (isLoading && aircraft.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={aircraft}
        renderItem={renderAircraftCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddAircraft}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    height: 220,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cardBackground: {
    flex: 1,
  },
  cardImage: {
    borderRadius: 16,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  registration: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  aircraftType: {
    fontSize: 16,
    color: '#E2E8F0',
    marginTop: 4,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardFooter: {
    marginTop: 12,
  },
  hoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hoursItem: {
    alignItems: 'center',
    flex: 1,
  },
  hoursLabel: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 4,
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
