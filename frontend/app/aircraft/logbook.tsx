import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import api from '../../services/api';

// Types
type FlightStatus = 'PROPOSED' | 'CONFIRMED' | 'IGNORED';

interface FlightCandidate {
  id: string;
  aircraft_id: string;
  status: FlightStatus;
  departure_icao: string | null;
  arrival_icao: string | null;
  depart_ts: string;
  arrival_ts: string;
  duration_est_minutes: number;
  source: string;
  created_at: string;
  confirmed_at: string | null;
}

interface LogEntry {
  _id: string;
  date: string;
  flight_time: number;
  departure?: string;
  arrival?: string;
  pilot?: string;
  remarks?: string;
}

export default function LogBookScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [proposedFlights, setProposedFlights] = useState<FlightCandidate[]>([]);
  const [confirmedFlights, setConfirmedFlights] = useState<FlightCandidate[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFlight, setEditingFlight] = useState<FlightCandidate | null>(null);
  const [editDeparture, setEditDeparture] = useState('');
  const [editArrival, setEditArrival] = useState('');
  const [editDuration, setEditDuration] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [aircraftId])
  );

  const loadData = async () => {
    if (!aircraftId) return;
    
    try {
      // Load proposed flights
      const proposedRes = await api.get(`/api/aircraft/${aircraftId}/flight-candidates?status=PROPOSED`);
      setProposedFlights(proposedRes.data || []);

      // Load confirmed flights
      const confirmedRes = await api.get(`/api/aircraft/${aircraftId}/flight-candidates?status=CONFIRMED`);
      setConfirmedFlights(confirmedRes.data || []);

      // Load log entries (if endpoint exists)
      try {
        const logRes = await api.get(`/api/logbook/${aircraftId}`);
        setLogEntries(logRes.data || []);
      } catch {
        setLogEntries([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleConfirmFlight = async (flight: FlightCandidate) => {
    Alert.alert(
      'Confirmer ce vol ?',
      `Durée: ${flight.duration_est_minutes} min\nLes heures seront ajoutées à la cellule, moteur et hélice.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await api.post(`/api/flight-candidates/${flight.id}/confirm`);
              Alert.alert('Succès', 'Vol confirmé et heures ajoutées');
              loadData();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Erreur lors de la confirmation');
            }
          },
        },
      ]
    );
  };

  const handleIgnoreFlight = async (flight: FlightCandidate) => {
    Alert.alert(
      'Ignorer ce vol ?',
      'Ce vol proposé sera ignoré et n\'affectera pas les heures.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ignorer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/api/flight-candidates/${flight.id}/ignore`);
              loadData();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Erreur');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (flight: FlightCandidate) => {
    setEditingFlight(flight);
    setEditDeparture(flight.departure_icao || '');
    setEditArrival(flight.arrival_icao || '');
    setEditDuration(flight.duration_est_minutes.toString());
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFlight) return;

    try {
      await api.post(`/api/flight-candidates/${editingFlight.id}/edit`, {
        departure_icao: editDeparture || null,
        arrival_icao: editArrival || null,
        duration_est_minutes: parseInt(editDuration) || editingFlight.duration_est_minutes,
      });
      setEditModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur lors de la modification');
    }
  };

  // Dev: Add test flight
  const addTestFlight = async () => {
    if (!aircraftId) return;

    const now = new Date();
    const departTs = new Date(now.getTime() - 90 * 60000); // 90 min ago
    const arrivalTs = now;

    try {
      await api.post(`/api/aircraft/${aircraftId}/flight-candidates`, {
        departure_icao: 'CYUL',
        arrival_icao: 'CYQB',
        depart_ts: departTs.toISOString(),
        arrival_ts: arrivalTs.toISOString(),
        duration_est_minutes: 90,
        source: 'gps_estimate',
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-CA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}` : `${mins}min`;
  };

  const renderProposedFlight = ({ item }: { item: FlightCandidate }) => (
    <View style={styles.proposedCard}>
      <View style={styles.proposedHeader}>
        <View style={styles.proposedBadge}>
          <Ionicons name="time" size={14} color="#F59E0B" />
          <Text style={styles.proposedBadgeText}>Proposé</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(item.duration_est_minutes)}</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.airportBox}>
          <Text style={styles.icaoCode}>{item.departure_icao || '----'}</Text>
          <Text style={styles.timeText}>{formatDateTime(item.depart_ts)}</Text>
        </View>
        <Ionicons name="airplane" size={20} color="#64748B" style={styles.planeIcon} />
        <View style={styles.airportBox}>
          <Text style={styles.icaoCode}>{item.arrival_icao || '----'}</Text>
          <Text style={styles.timeText}>{formatDateTime(item.arrival_ts)}</Text>
        </View>
      </View>

      <Text style={styles.sourceText}>
        Estimé à partir des capteurs — à confirmer
      </Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => handleConfirmFlight(item)}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>Confirmer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={18} color="#3B82F6" />
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.ignoreButton}
          onPress={() => handleIgnoreFlight(item)}
        >
          <Ionicons name="close" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConfirmedFlight = ({ item }: { item: FlightCandidate }) => (
    <View style={styles.confirmedCard}>
      <View style={styles.confirmedHeader}>
        <View style={styles.confirmedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.confirmedBadgeText}>Confirmé</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(item.duration_est_minutes)}</Text>
      </View>

      <View style={styles.routeContainer}>
        <Text style={styles.routeText}>
          {item.departure_icao || '----'} → {item.arrival_icao || '----'}
        </Text>
        <Text style={styles.dateText}>{formatDateTime(item.depart_ts)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Log Book</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity onPress={addTestFlight} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Proposed Flights Section */}
        {proposedFlights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="airplane" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Vols proposés (à confirmer)</Text>
            </View>
            
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={14} color="#92400E" />
              <Text style={styles.disclaimerText}>
                Estimés à partir des capteurs. Vérifiez et confirmez avant d'affecter les heures.
              </Text>
            </View>

            {proposedFlights.map((flight) => (
              <View key={flight.id}>
                {renderProposedFlight({ item: flight })}
              </View>
            ))}
          </View>
        )}

        {/* Confirmed Flights Section */}
        {confirmedFlights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Vols confirmés</Text>
            </View>

            {confirmedFlights.map((flight) => (
              <View key={flight.id}>
                {renderConfirmedFlight({ item: flight })}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {proposedFlights.length === 0 && confirmedFlights.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="airplane-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucun vol enregistré</Text>
            <Text style={styles.emptyText}>
              Les vols détectés apparaîtront ici pour confirmation.
            </Text>
            <TouchableOpacity style={styles.testButton} onPress={addTestFlight}>
              <Ionicons name="add-circle" size={20} color="#3B82F6" />
              <Text style={styles.testButtonText}>Ajouter un vol test</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le vol</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Départ (ICAO)</Text>
                <TextInput
                  style={styles.input}
                  value={editDeparture}
                  onChangeText={setEditDeparture}
                  placeholder="CYUL"
                  autoCapitalize="characters"
                  maxLength={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Arrivée (ICAO)</Text>
                <TextInput
                  style={styles.input}
                  value={editArrival}
                  onChangeText={setEditArrival}
                  placeholder="CYQB"
                  autoCapitalize="characters"
                  maxLength={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Durée (minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={editDuration}
                  onChangeText={setEditDuration}
                  placeholder="90"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveModalText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  proposedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  proposedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  proposedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proposedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  duration: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  airportBox: {
    alignItems: 'center',
    flex: 1,
  },
  icaoCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  planeIcon: {
    transform: [{ rotate: '90deg' }],
    marginHorizontal: 12,
  },
  sourceText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  ignoreButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  confirmedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  confirmedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  confirmedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  testButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  saveModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
