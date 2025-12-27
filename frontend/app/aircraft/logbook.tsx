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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import api from '../../services/api';

// Types
type TabType = 'logbook' | 'proposed';
type FlightStatus = 'PROPOSED' | 'CONFIRMED' | 'IGNORED';

interface LogBookEntry {
  id: string;
  date: string;
  tt_airframe: number;
  tt_engine: number;
  tt_propeller: number;
  description: string;
  references: string | null;
  pilot_label: string | null;
  author: string;
  created_at: string;
}

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
}

export default function LogBookScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('logbook');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<LogBookEntry[]>([]);
  const [proposedFlights, setProposedFlights] = useState<FlightCandidate[]>([]);
  
  // Add entry modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    tt_airframe: '',
    tt_engine: '',
    tt_propeller: '',
    description: '',
    references: '',
    pilot_label: '',
  });

  // Edit flight modal
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
      // Load logbook entries
      const logRes = await api.get(`/api/aircraft/${aircraftId}/logbook`);
      setEntries(logRes.data || []);

      // Load proposed flights
      const proposedRes = await api.get(`/api/aircraft/${aircraftId}/flight-candidates?status=PROPOSED`);
      setProposedFlights(proposedRes.data || []);
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

  // ============ LOGBOOK FUNCTIONS ============
  const handleAddEntry = async () => {
    if (!newEntry.description.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une description');
      return;
    }

    try {
      await api.post(`/api/aircraft/${aircraftId}/logbook`, {
        date: new Date(newEntry.date).toISOString(),
        tt_airframe: parseFloat(newEntry.tt_airframe) || 0,
        tt_engine: parseFloat(newEntry.tt_engine) || 0,
        tt_propeller: parseFloat(newEntry.tt_propeller) || 0,
        description: newEntry.description,
        references: newEntry.references || null,
        pilot_label: newEntry.pilot_label || null,
      });
      
      setAddModalVisible(false);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        tt_airframe: '',
        tt_engine: '',
        tt_propeller: '',
        description: '',
        references: '',
        pilot_label: '',
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur lors de l\'ajout');
    }
  };

  // ============ PROPOSED FLIGHTS FUNCTIONS ============
  const handleConfirmFlight = async (flight: FlightCandidate) => {
    Alert.alert(
      'Confirmer ce vol ?',
      `Durée: ${flight.duration_est_minutes} min\nLes heures seront ajoutées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await api.post(`/api/flight-candidates/${flight.id}/confirm`);
              Alert.alert('Succès', 'Vol confirmé');
              loadData();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Erreur');
            }
          },
        },
      ]
    );
  };

  const handleIgnoreFlight = async (flight: FlightCandidate) => {
    try {
      await api.post(`/api/flight-candidates/${flight.id}/ignore`);
      loadData();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur');
    }
  };

  const openEditFlightModal = (flight: FlightCandidate) => {
    setEditingFlight(flight);
    setEditDeparture(flight.departure_icao || '');
    setEditArrival(flight.arrival_icao || '');
    setEditDuration(flight.duration_est_minutes.toString());
    setEditModalVisible(true);
  };

  const handleSaveFlightEdit = async () => {
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
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur');
    }
  };

  // ============ FORMATTERS ============
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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

  const formatHours = (hours: number) => hours.toFixed(1);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}` : `${mins}min`;
  };

  // ============ RENDER LOGBOOK ============
  const renderLogEntry = ({ item, index }: { item: LogBookEntry; index: number }) => (
    <View style={[styles.entryRow, index % 2 === 0 && styles.entryRowAlt]}>
      <View style={styles.dateCell}>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.ttCell}>
        <Text style={styles.ttValue}>{formatHours(item.tt_airframe)}</Text>
      </View>
      <View style={styles.ttCell}>
        <Text style={styles.ttValue}>{formatHours(item.tt_engine)}</Text>
      </View>
      <View style={styles.ttCell}>
        <Text style={styles.ttValue}>{formatHours(item.tt_propeller)}</Text>
      </View>
      <View style={styles.descCell}>
        <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
        {item.pilot_label && (
          <Text style={styles.pilotText}>Pilote: {item.pilot_label}</Text>
        )}
      </View>
      <View style={styles.authorCell}>
        <Text style={styles.authorText}>{item.author}</Text>
      </View>
    </View>
  );

  const renderLogHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.dateCell}><Text style={styles.headerText}>Date</Text></View>
      <View style={styles.ttCell}><Text style={styles.headerText}>TT C.</Text></View>
      <View style={styles.ttCell}><Text style={styles.headerText}>TT M.</Text></View>
      <View style={styles.ttCell}><Text style={styles.headerText}>TT H.</Text></View>
      <View style={styles.descCell}><Text style={styles.headerText}>Description</Text></View>
      <View style={styles.authorCell}><Text style={styles.headerText}>Par</Text></View>
    </View>
  );

  // ============ RENDER PROPOSED FLIGHTS ============
  const renderProposedFlight = ({ item }: { item: FlightCandidate }) => (
    <View style={styles.proposedCard}>
      <View style={styles.proposedHeader}>
        <View style={styles.proposedBadge}>
          <Ionicons name="time" size={14} color="#F59E0B" />
          <Text style={styles.proposedBadgeText}>À confirmer</Text>
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

      <Text style={styles.sourceText}>Estimé — à vérifier et confirmer</Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.confirmButton} onPress={() => handleConfirmFlight(item)}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>Confirmer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditFlightModal(item)}>
          <Ionicons name="pencil" size={18} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ignoreButton} onPress={() => handleIgnoreFlight(item)}>
          <Ionicons name="close" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
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
        {activeTab === 'logbook' && (
          <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#1E3A8A" />
          </TouchableOpacity>
        )}
        {activeTab === 'proposed' && <View style={{ width: 40 }} />}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'logbook' && styles.tabActive]}
          onPress={() => setActiveTab('logbook')}
        >
          <Ionicons name="book" size={18} color={activeTab === 'logbook' ? '#1E3A8A' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'logbook' && styles.tabTextActive]}>
            Registre
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'proposed' && styles.tabActive]}
          onPress={() => setActiveTab('proposed')}
        >
          <Ionicons name="airplane" size={18} color={activeTab === 'proposed' ? '#1E3A8A' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'proposed' && styles.tabTextActive]}>
            Vols proposés
          </Text>
          {proposedFlights.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{proposedFlights.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'logbook' ? (
        <View style={styles.tableContainer}>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>Carnet de route — Document informatif uniquement</Text>
          </View>
          {renderLogHeader()}
          <FlatList
            data={entries}
            renderItem={renderLogEntry}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucune entrée</Text>
              </View>
            }
          />
        </View>
      ) : (
        <ScrollView 
          style={styles.proposedContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Disclaimer */}
          <View style={styles.proposedDisclaimer}>
            <Ionicons name="information-circle" size={14} color="#92400E" />
            <Text style={styles.proposedDisclaimerText}>
              Vols estimés — vérifiez et confirmez avant d'affecter les heures
            </Text>
          </View>

          {/* Proposed Flights List */}
          {proposedFlights.length > 0 ? (
            proposedFlights.map((flight) => (
              <View key={flight.id}>{renderProposedFlight({ item: flight })}</View>
            ))
          ) : (
            <View style={styles.emptyProposed}>
              <Ionicons name="airplane-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyProposedTitle}>Aucun vol en attente</Text>
              <Text style={styles.emptyProposedText}>
                Les vols détectés apparaîtront ici
              </Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add Entry Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle entrée</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput style={styles.input} value={newEntry.date} onChangeText={(t) => setNewEntry({...newEntry, date: t})} placeholder="AAAA-MM-JJ" />
              </View>
              <View style={styles.ttRow}>
                <View style={styles.ttInputGroup}>
                  <Text style={styles.inputLabel}>TT Cellule</Text>
                  <TextInput style={styles.input} value={newEntry.tt_airframe} onChangeText={(t) => setNewEntry({...newEntry, tt_airframe: t})} placeholder="0.0" keyboardType="decimal-pad" />
                </View>
                <View style={styles.ttInputGroup}>
                  <Text style={styles.inputLabel}>TT Moteur</Text>
                  <TextInput style={styles.input} value={newEntry.tt_engine} onChangeText={(t) => setNewEntry({...newEntry, tt_engine: t})} placeholder="0.0" keyboardType="decimal-pad" />
                </View>
                <View style={styles.ttInputGroup}>
                  <Text style={styles.inputLabel}>TT Hélice</Text>
                  <TextInput style={styles.input} value={newEntry.tt_propeller} onChangeText={(t) => setNewEntry({...newEntry, tt_propeller: t})} placeholder="0.0" keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput style={[styles.input, styles.textArea]} value={newEntry.description} onChangeText={(t) => setNewEntry({...newEntry, description: t})} placeholder="Ex: CYUL → CYMX" multiline numberOfLines={3} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Références</Text>
                <TextInput style={styles.input} value={newEntry.references} onChangeText={(t) => setNewEntry({...newEntry, references: t})} placeholder="WO #, etc." />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pilote (informatif)</Text>
                <TextInput style={styles.input} value={newEntry.pilot_label} onChangeText={(t) => setNewEntry({...newEntry, pilot_label: t})} placeholder="Ex: Alex" />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.cancelModalText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalButton} onPress={handleAddEntry}>
                <Text style={styles.saveModalText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Flight Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
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
                <TextInput style={styles.input} value={editDeparture} onChangeText={setEditDeparture} placeholder="CYUL" autoCapitalize="characters" maxLength={4} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Arrivée (ICAO)</Text>
                <TextInput style={styles.input} value={editArrival} onChangeText={setEditArrival} placeholder="CYQB" autoCapitalize="characters" maxLength={4} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Durée (minutes)</Text>
                <TextInput style={styles.input} value={editDuration} onChangeText={setEditDuration} placeholder="90" keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelModalText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalButton} onPress={handleSaveFlightEdit}>
                <Text style={styles.saveModalText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  
  // Tabs
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#1E3A8A' },
  tabText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  tabTextActive: { color: '#1E3A8A', fontWeight: '600' },
  badge: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  
  // Logbook Table
  tableContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  disclaimer: { backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  disclaimerText: { fontSize: 11, color: '#64748B', textAlign: 'center', fontStyle: 'italic' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1E3A8A', paddingVertical: 10, paddingHorizontal: 8 },
  headerText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  entryRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  entryRowAlt: { backgroundColor: '#F8FAFC' },
  dateCell: { width: 65, justifyContent: 'center' },
  dateText: { fontSize: 11, color: '#1E293B' },
  ttCell: { width: 42, justifyContent: 'center', alignItems: 'center' },
  ttValue: { fontSize: 11, color: '#1E293B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  descCell: { flex: 1, paddingHorizontal: 6, justifyContent: 'center' },
  descText: { fontSize: 11, color: '#1E293B', lineHeight: 15 },
  pilotText: { fontSize: 9, color: '#64748B', marginTop: 2 },
  authorCell: { width: 50, justifyContent: 'center', alignItems: 'center' },
  authorText: { fontSize: 9, color: '#64748B', textAlign: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#94A3B8' },

  // Proposed Flights
  proposedContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  trackingToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  trackingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackingTextContainer: {},
  trackingLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  trackingHint: { fontSize: 12, color: '#64748B', marginTop: 2 },
  proposedDisclaimer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF3C7', margin: 16, padding: 12, borderRadius: 8, gap: 8 },
  proposedDisclaimerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  proposedCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#FDE68A' },
  proposedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  proposedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  proposedBadgeText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  duration: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  airportBox: { alignItems: 'center', flex: 1 },
  icaoCode: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  timeText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  planeIcon: { transform: [{ rotate: '90deg' }], marginHorizontal: 12 },
  sourceText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginBottom: 12 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  confirmButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 8, gap: 6 },
  confirmButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  editButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderRadius: 8 },
  ignoreButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', borderRadius: 8 },
  emptyProposed: { alignItems: 'center', padding: 40 },
  emptyProposedTitle: { fontSize: 18, fontWeight: '600', color: '#475569', marginTop: 16 },
  emptyProposedText: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  modalBody: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#64748B', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: '#1E293B' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  ttRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  ttInputGroup: { flex: 1 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancelModalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelModalText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  saveModalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#1E3A8A', alignItems: 'center' },
  saveModalText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
