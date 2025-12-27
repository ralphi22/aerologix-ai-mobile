/**
 * Pilot Invite View - Remote aircraft card for non-owner pilots
 * 
 * GARDE-FOU #2: Strictly read-only view
 * GARDE-FOU #3: Micro-counter is local UI only
 * GARDE-FOU #6: Single disclaimer at bottom
 * 
 * TC-SAFE: Information contribution only - owner remains responsible
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../services/api';

// Aircraft data from invite
interface AircraftData {
  aircraft_id: string;
  registration: string;
  manufacturer: string;
  model: string;
  aircraft_type: string;
  photo_url?: string;
  airframe_hours: number;
  engine_hours: number;
  propeller_hours: number;
  pilot_label: string;
  invite_id: string;
}

export default function PilotInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aircraft, setAircraft] = useState<AircraftData | null>(null);
  
  // GARDE-FOU #3: Micro-counter is LOCAL UI only
  const [isTracking, setIsTracking] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load aircraft data on mount
  useEffect(() => {
    loadAircraftData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token]);

  // Timer for session counter
  useEffect(() => {
    if (isTracking && sessionStartTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 60000);
        setSessionMinutes(elapsed);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking, sessionStartTime]);

  const loadAircraftData = async () => {
    if (!token) {
      setError('Lien invalide');
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/api/pilot-invites/view/${token}`);
      setAircraft(response.data);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Accès expiré ou révoqué';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Format time as h:mm
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0:00';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  // Start tracking - GARDE-FOU #3: Local counter only
  const startTracking = () => {
    setIsTracking(true);
    setSessionStartTime(Date.now());
    setSessionMinutes(0);
  };

  // Stop tracking and submit - GARDE-FOU #3: Send duration ONCE
  const stopTracking = async () => {
    if (!sessionStartTime || !token) return;

    const durationMinutes = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 60000));
    
    setIsTracking(false);
    setSessionStartTime(null);

    try {
      // GARDE-FOU #4: Submit with required fields
      await api.post(`/api/pilot-invites/submit-flight/${token}`, {
        duration_est_minutes: durationMinutes
      });

      Alert.alert(
        'Vol enregistré',
        `Durée: ${formatTime(durationMinutes)}\n\nCe vol a été transmis au propriétaire pour confirmation.`,
        [{ text: 'OK' }]
      );

      setSessionMinutes(0);
    } catch (err: any) {
      Alert.alert('Erreur', err.response?.data?.detail || 'Impossible de transmettre le vol');
      // Re-enable tracking on error so pilot can retry
      setIsTracking(true);
      setSessionStartTime(Date.now() - (durationMinutes * 60000));
    }
  };

  // Toggle tracking
  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  // Error state - GARDE-FOU #2: Show expired message
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="lock-closed" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Accès expiré</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            Veuillez demander un nouveau lien au propriétaire de l'aéronef.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!aircraft) {
    return null;
  }

  // Main view - GARDE-FOU #2: Only card, no navigation
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with pilot label */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Vue pilote</Text>
        <View style={styles.pilotBadge}>
          <Ionicons name="person" size={14} color="#3B82F6" />
          <Text style={styles.pilotName}>{aircraft.pilot_label}</Text>
        </View>
      </View>

      {/* Aircraft Card - Main content */}
      <View style={styles.cardContainer}>
        <ImageBackground
          source={aircraft.photo_url ? { uri: aircraft.photo_url } : require('../../../assets/images/icon.png')}
          style={styles.cardBackground}
          imageStyle={styles.cardImage}
        >
          <LinearGradient
            colors={['rgba(30, 58, 138, 0.85)', 'rgba(30, 58, 138, 0.98)']}
            style={styles.cardGradient}
          >
            {/* Aircraft Info */}
            <View style={styles.cardHeader}>
              <Text style={styles.registration}>{aircraft.registration}</Text>
              <Text style={styles.aircraftType}>
                {aircraft.manufacturer} {aircraft.model || aircraft.aircraft_type}
              </Text>
            </View>

            {/* Hours Display (read-only) */}
            <View style={styles.hoursContainer}>
              <View style={styles.hoursItem}>
                <Ionicons name="speedometer-outline" size={18} color="#FFFFFF" />
                <Text style={styles.hoursLabel}>Cellule</Text>
                <Text style={styles.hoursValue}>{aircraft.airframe_hours}h</Text>
              </View>
              <View style={styles.hoursDivider} />
              <View style={styles.hoursItem}>
                <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                <Text style={styles.hoursLabel}>Moteur</Text>
                <Text style={styles.hoursValue}>{aircraft.engine_hours}h</Text>
              </View>
              <View style={styles.hoursDivider} />
              <View style={styles.hoursItem}>
                <Ionicons name="sync-outline" size={18} color="#FFFFFF" />
                <Text style={styles.hoursLabel}>Hélice</Text>
                <Text style={styles.hoursValue}>{aircraft.propeller_hours}h</Text>
              </View>
            </View>

            {/* Tracking Section */}
            <View style={styles.trackingSection}>
              {/* Session Counter - GARDE-FOU #3: Local UI only */}
              {isTracking && (
                <View style={styles.sessionCounter}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>En vol</Text>
                  </View>
                  <Text style={styles.sessionTime}>{formatTime(sessionMinutes)}</Text>
                </View>
              )}

              {/* Tracking Button */}
              <TouchableOpacity
                style={[
                  styles.trackingButton,
                  isTracking ? styles.trackingButtonActive : styles.trackingButtonInactive
                ]}
                onPress={toggleTracking}
              >
                <Ionicons 
                  name={isTracking ? "stop-circle" : "play-circle"} 
                  size={24} 
                  color="#FFFFFF" 
                />
                <Text style={styles.trackingButtonText}>
                  {isTracking ? 'Arrêter le suivi de vol' : 'Activer le suivi de vol'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* GARDE-FOU #6: Single disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Ionicons name="information-circle-outline" size={16} color="#64748B" />
        <Text style={styles.disclaimerText}>
          Cette fiche permet uniquement de transmettre des informations de vol estimées au propriétaire de l'aéronef. Elle ne constitue pas un carnet officiel.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  pilotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  pilotName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Card
  cardContainer: {
    flex: 1,
    padding: 16,
  },
  cardBackground: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardImage: {
    borderRadius: 20,
  },
  cardGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  cardHeader: {
    marginBottom: 24,
  },
  registration: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  aircraftType: {
    fontSize: 18,
    color: '#CBD5E1',
    marginTop: 4,
  },

  // Hours
  hoursContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  hoursItem: {
    flex: 1,
    alignItems: 'center',
  },
  hoursDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  hoursLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 6,
  },
  hoursValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },

  // Tracking
  trackingSection: {
    gap: 16,
  },
  sessionCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  sessionTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  trackingButtonInactive: {
    backgroundColor: '#3B82F6',
  },
  trackingButtonActive: {
    backgroundColor: '#EF4444',
  },
  trackingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Disclaimer - GARDE-FOU #6
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
});
