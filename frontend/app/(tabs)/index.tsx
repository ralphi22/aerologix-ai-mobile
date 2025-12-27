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
  
  // État de suivi de vol par avion
  const [trackingState, setTrackingState] = useState<TrackingState>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadAircraft();
    
    // Démarrer le timer global pour mettre à jour les compteurs
    timerRef.current = setInterval(() => {
      setTrackingState(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (updated[id].isActive && updated[id].startTime) {
            const elapsed = Math.floor((Date.now() - updated[id].startTime) / 60000);
            updated[id] = { ...updated[id], elapsedMinutes: elapsed };
          }
        });
        return updated;
      });
    }, 1000); // Update every second for smoother display

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Formater le temps en h:mm
  const formatSessionTime = (minutes: number): string => {
    if (minutes === 0) return '0:00';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  // Démarrer le suivi de vol
  const startTracking = async (aircraftId: string) => {
    setTrackingState(prev => ({
      ...prev,
      [aircraftId]: {
        isActive: true,
        startTime: Date.now(),
        elapsedMinutes: 0
      }
    }));
  };

  // Arrêter le suivi et créer FlightCandidate
  const stopTracking = async (aircraftId: string) => {
    const state = trackingState[aircraftId];
    if (!state || !state.startTime) return;

    const durationMinutes = Math.max(1, Math.floor((Date.now() - state.startTime) / 60000));
    
    // Créer le FlightCandidate PROPOSED
    try {
      const departTs = new Date(state.startTime).toISOString();
      const arrivalTs = new Date().toISOString();
      
      await api.post(`/api/aircraft/${aircraftId}/flight-candidates`, {
        depart_ts: departTs,
        arrival_ts: arrivalTs,
        duration_est_minutes: durationMinutes,
        source: 'session_tracking'
      });

      Alert.alert(
        'Vol enregistré',
        `Durée: ${formatSessionTime(durationMinutes)}\n\nCe vol est proposé et doit être confirmé depuis le Log Book.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error creating flight candidate:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le vol');
    }

    // Reset state
    setTrackingState(prev => ({
      ...prev,
      [aircraftId]: {
        isActive: false,
        startTime: null,
        elapsedMinutes: 0
      }
    }));
  };

  // Toggle suivi
  const toggleTracking = (aircraftId: string) => {
    const state = trackingState[aircraftId];
    if (state?.isActive) {
      stopTracking(aircraftId);
    } else {
      startTracking(aircraftId);
    }
  };

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

  const renderAircraftCard = ({ item }: any) => {
    const tracking = trackingState[item._id];
    const isTracking = tracking?.isActive || false;
    const sessionMinutes = tracking?.elapsedMinutes || 0;

    return (
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

              {/* Suivi de vol - Section */}
              <View style={styles.trackingSection}>
                {/* Micro-compteur de session */}
                {isTracking && (
                  <View style={styles.sessionCounter}>
                    <Ionicons name="time" size={14} color="#10B981" />
                    <Text style={styles.sessionTime}>{formatSessionTime(sessionMinutes)}</Text>
                    <View style={styles.recordingDot} />
                  </View>
                )}

                {/* Bouton ON/OFF */}
                <TouchableOpacity
                  style={[
                    styles.trackingButton,
                    isTracking ? styles.trackingButtonActive : styles.trackingButtonInactive
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleTracking(item._id);
                  }}
                >
                  <Ionicons 
                    name={isTracking ? "stop-circle" : "play-circle"} 
                    size={18} 
                    color={isTracking ? "#FFFFFF" : "#FFFFFF"} 
                  />
                  <Text style={styles.trackingButtonText}>
                    {isTracking ? 'Arrêter le suivi' : 'Activer le suivi'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

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
    height: 280,
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
  // Styles pour le suivi de vol
  trackingSection: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  sessionCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  sessionTime: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  trackingButtonInactive: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
  },
  trackingButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
