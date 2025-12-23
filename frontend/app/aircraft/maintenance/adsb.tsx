import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../../services/api';

interface ADSB {
  _id: string;
  adsb_type: string;
  reference_number: string;
  title?: string;
  description?: string;
  status: string;
  compliance_date?: string;
  compliance_airframe_hours?: number;
  compliance_engine_hours?: number;
  source?: string;
}

export default function MaintenanceADSBScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [records, setRecords] = useState<ADSB[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  
  // Mode sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await api.get(`/api/adsb/${aircraftId}`);
      setRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching AD/SB:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-CA');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLIED':
        return '#10B981';
      case 'PENDING':
        return '#F59E0B';
      case 'NOT_APPLICABLE':
        return '#6B7280';
      default:
        return '#94A3B8';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLIED':
        return 'Conforme';
      case 'PENDING':
        return 'En attente';
      case 'NOT_APPLICABLE':
        return 'N/A';
      default:
        return status || '—';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'AD' ? '#EF4444' : '#F59E0B';
  };

  // Toggle mode sélection
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  // Toggle sélection d'un item
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Sélectionner/désélectionner tous
  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r._id)));
    }
  };

  // Suppression multiple
  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const confirmDelete = async () => {
      setDeleting(true);
      const idsToDelete = Array.from(selectedIds);
      const errors: string[] = [];
      const deleted: string[] = [];

      for (const id of idsToDelete) {
        try {
          await api.delete(`/api/adsb/record/${id}`);
          deleted.push(id);
        } catch (error: any) {
          const status = error.response?.status;
          if (status === 401 || status === 403) {
            errors.push(`Authentification requise`);
            break;
          } else if (status === 404) {
            errors.push(`Élément introuvable: ${id}`);
          } else {
            errors.push(error.response?.data?.detail || `Erreur: ${id}`);
          }
        }
      }

      // Mettre à jour l'UI
      if (deleted.length > 0) {
        setRecords(prev => prev.filter(r => !deleted.includes(r._id)));
        setSelectedIds(new Set());
      }

      setDeleting(false);
      setSelectionMode(false);

      // Afficher le résultat
      if (errors.length > 0) {
        const message = `${deleted.length} supprimé(s)\n${errors.length} erreur(s):\n${errors.join('\n')}`;
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Résultat', message);
        }
      } else {
        const message = `${deleted.length} AD/SB supprimé(s)`;
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Succès', message);
        }
      }
    };

    // Confirmation
    const message = `Supprimer ${count} élément(s) ?\n\nCette action est irréversible.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        await confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirmer la suppression',
        message,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  const renderRecord = ({ item }: { item: ADSB }) => {
    const isSelected = selectedIds.has(item._id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.recordCard,
          selectionMode && styles.selectableCard,
          isSelected && styles.selectedCard
        ]}
        onPress={() => selectionMode && toggleSelection(item._id)}
        activeOpacity={selectionMode ? 0.7 : 1}
      >
        {/* Checkbox en mode sélection */}
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </View>
        )}

        <View style={styles.recordContent}>
          <View style={styles.recordHeader}>
            <View style={[styles.typeTag, { backgroundColor: getTypeColor(item.adsb_type) + '20' }]}>
              <Text style={[styles.typeText, { color: getTypeColor(item.adsb_type) }]}>
                {item.adsb_type}
              </Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.recordRef}>{item.reference_number}</Text>
          {item.title && <Text style={styles.recordTitle}>{item.title}</Text>}
          {item.description && (
            <Text style={styles.recordDesc} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.recordDetails}>
            {item.compliance_date && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={14} color="#64748B" />
                <Text style={styles.detailText}>{formatDate(item.compliance_date)}</Text>
              </View>
            )}
            {item.compliance_airframe_hours && (
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={14} color="#64748B" />
                <Text style={styles.detailText}>{item.compliance_airframe_hours} h</Text>
              </View>
            )}
          </View>

          {item.source === 'ocr' && (
            <View style={styles.sourceRow}>
              <View style={styles.sourceTag}>
                <Ionicons name="scan" size={12} color="#3B82F6" />
                <Text style={styles.sourceText}>OCR</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const adCount = records.filter(r => r.adsb_type === 'AD').length;
  const sbCount = records.filter(r => r.adsb_type === 'SB').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AD/SB</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        
        {records.length > 0 && (
          <TouchableOpacity 
            onPress={toggleSelectionMode} 
            style={styles.headerButton}
          >
            <Ionicons 
              name={selectionMode ? "close" : "trash-outline"} 
              size={24} 
              color={selectionMode ? "#EF4444" : "#1E3A8A"} 
            />
          </TouchableOpacity>
        )}
        {records.length === 0 && (
          <TouchableOpacity onPress={fetchRecords} style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color="#1E3A8A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Barre de sélection */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
            <Ionicons 
              name={selectedIds.size === records.length ? "checkbox" : "square-outline"} 
              size={20} 
              color="#1E3A8A" 
            />
            <Text style={styles.selectAllText}>
              {selectedIds.size === records.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0 || deleting}
            style={[
              styles.deleteSelectedButton,
              selectedIds.size === 0 && styles.deleteSelectedButtonDisabled
            ]}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash" size={18} color="#FFFFFF" />
                <Text style={styles.deleteSelectedText}>
                  Supprimer ({selectedIds.size})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!loading && records.length > 0 && !selectionMode && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color: '#EF4444' }]}>{adCount}</Text>
            <Text style={styles.summaryLabel}>AD</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color: '#F59E0B' }]}>{sbCount}</Text>
            <Text style={styles.summaryLabel}>SB</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Aucun AD/SB</Text>
          <Text style={styles.emptyText}>
            Les directives et bulletins identifiés par OCR apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerButton: {
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
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  deleteSelectedButtonDisabled: {
    backgroundColor: '#FDA4AF',
  },
  deleteSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  },
  listContainer: {
    padding: 16,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
  },
  selectableCard: {
    borderColor: '#CBD5E1',
  },
  selectedCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  checkboxContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4,
    width: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  recordContent: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordRef: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginTop: 4,
  },
  recordDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  recordDetails: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#64748B',
  },
  sourceRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
