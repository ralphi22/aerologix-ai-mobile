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
  attachments: string[] | null;
  created_at: string;
}

export default function LogBookScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<LogBookEntry[]>([]);
  
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [aircraftId])
  );

  const loadData = async () => {
    if (!aircraftId) return;
    
    try {
      const res = await api.get(`/api/aircraft/${aircraftId}/logbook`);
      setEntries(res.data || []);
    } catch (error) {
      console.error('Error loading logbook:', error);
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const renderEntry = ({ item, index }: { item: LogBookEntry; index: number }) => (
    <View style={[styles.entryRow, index % 2 === 0 && styles.entryRowAlt]}>
      {/* Date */}
      <View style={styles.dateCell}>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
      </View>

      {/* TT Columns */}
      <View style={styles.ttCell}>
        <Text style={styles.ttValue}>{formatHours(item.tt_airframe)}</Text>
      </View>
      <View style={styles.ttCell}>
        <Text style={styles.ttValue}>{formatHours(item.tt_engine)}</Text>
      </View>
      <View style={styles.ttCell}>
        <Text style={styles.ttValue}>{formatHours(item.tt_propeller)}</Text>
      </View>

      {/* Description */}
      <View style={styles.descCell}>
        <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
        {item.references && (
          <Text style={styles.refText}>Réf: {item.references}</Text>
        )}
        {item.pilot_label && (
          <Text style={styles.pilotText}>Pilote: {item.pilot_label}</Text>
        )}
      </View>

      {/* Author */}
      <View style={styles.authorCell}>
        <Text style={styles.authorText}>{item.author}</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.dateCell}>
        <Text style={styles.headerText}>Date</Text>
      </View>
      <View style={styles.ttCell}>
        <Text style={styles.headerText}>TT Cell.</Text>
      </View>
      <View style={styles.ttCell}>
        <Text style={styles.headerText}>TT Mot.</Text>
      </View>
      <View style={styles.ttCell}>
        <Text style={styles.headerText}>TT Hél.</Text>
      </View>
      <View style={styles.descCell}>
        <Text style={styles.headerText}>Description / Références</Text>
      </View>
      <View style={styles.authorCell}>
        <Text style={styles.headerText}>Par</Text>
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
        <TouchableOpacity 
          onPress={() => setAddModalVisible(true)} 
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Carnet de route — Document informatif uniquement
        </Text>
      </View>

      {/* Table */}
      <View style={styles.tableContainer}>
        {renderHeader()}
        
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune entrée</Text>
              <TouchableOpacity 
                style={styles.addFirstButton}
                onPress={() => setAddModalVisible(true)}
              >
                <Text style={styles.addFirstText}>Ajouter une entrée</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add Entry Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle entrée</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={newEntry.date}
                  onChangeText={(t) => setNewEntry({ ...newEntry, date: t })}
                  placeholder="AAAA-MM-JJ"
                />
              </View>

              {/* TT Row */}
              <View style={styles.ttRow}>
                <View style={styles.ttInputGroup}>
                  <Text style={styles.inputLabel}>TT Cellule</Text>
                  <TextInput
                    style={styles.input}
                    value={newEntry.tt_airframe}
                    onChangeText={(t) => setNewEntry({ ...newEntry, tt_airframe: t })}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.ttInputGroup}>
                  <Text style={styles.inputLabel}>TT Moteur</Text>
                  <TextInput
                    style={styles.input}
                    value={newEntry.tt_engine}
                    onChangeText={(t) => setNewEntry({ ...newEntry, tt_engine: t })}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.ttInputGroup}>
                  <Text style={styles.inputLabel}>TT Hélice</Text>
                  <TextInput
                    style={styles.input}
                    value={newEntry.tt_propeller}
                    onChangeText={(t) => setNewEntry({ ...newEntry, tt_propeller: t })}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newEntry.description}
                  onChangeText={(t) => setNewEntry({ ...newEntry, description: t })}
                  placeholder="Ex: CYUL → CYQB, 1h30"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* References */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Références</Text>
                <TextInput
                  style={styles.input}
                  value={newEntry.references}
                  onChangeText={(t) => setNewEntry({ ...newEntry, references: t })}
                  placeholder="WO #, Facture, etc."
                />
              </View>

              {/* Pilot */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pilote (informatif)</Text>
                <TextInput
                  style={styles.input}
                  value={newEntry.pilot_label}
                  onChangeText={(t) => setNewEntry({ ...newEntry, pilot_label: t })}
                  placeholder="Ex: Alex, Instructeur"
                />
                <Text style={styles.inputHint}>
                  Identifiant informatif seulement, pas une signature légale
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleAddEntry}
              >
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
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  disclaimer: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  entryRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  dateCell: {
    width: 70,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#1E293B',
  },
  ttCell: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ttValue: {
    fontSize: 12,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  descCell: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  descText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 16,
  },
  refText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  pilotText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  authorCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 16,
  },
  addFirstButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFirstText: {
    color: '#1E3A8A',
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
    maxHeight: '85%',
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
  inputHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ttRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ttInputGroup: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
  },
  saveModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
