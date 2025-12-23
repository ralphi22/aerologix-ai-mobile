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

interface Part {
  _id: string;
  part_number: string;
  name?: string;
  serial_number?: string;
  quantity: number;
  purchase_price?: number;
  supplier?: string;
  installation_date?: string;
  installation_airframe_hours?: number;
  source?: string;
  confirmed?: boolean;
}

export default function MaintenancePartsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  
  // Mode sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const response = await api.get(`/api/parts/aircraft/${aircraftId}`);
      setParts(response.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-CA');
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

  // Sélectionner/désélectionner tous les items OCR
  const toggleSelectAll = () => {
    const ocrParts = parts.filter(p => p.source === 'ocr');
    if (selectedIds.size === ocrParts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ocrParts.map(p => p._id)));
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
          await api.delete(`/api/parts/record/${id}`);
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

      // Mettre à jour l'UI avec les items supprimés
      if (deleted.length > 0) {
        setParts(prev => prev.filter(p => !deleted.includes(p._id)));
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
        const message = `${deleted.length} pièce(s) supprimée(s)`;
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

  const renderPart = ({ item }: { item: Part }) => {
    const isOCR = item.source === 'ocr';
    const isSelected = selectedIds.has(item._id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.partCard,
          selectionMode && isOCR && styles.selectableCard,
          isSelected && styles.selectedCard
        ]}
        onPress={() => selectionMode && isOCR && toggleSelection(item._id)}
        activeOpacity={selectionMode ? 0.7 : 1}
        disabled={selectionMode && !isOCR}
      >
        {/* Checkbox en mode sélection */}
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            {isOCR ? (
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
            ) : (
              <Ionicons name="lock-closed" size={18} color="#CBD5E1" />
            )}
          </View>
        )}

        <View style={styles.partContent}>
          <View style={styles.partHeader}>
            <View style={styles.partIcon}>
              <Ionicons name="hardware-chip" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.partInfo}>
              <Text style={styles.partName}>{item.name || item.part_number}</Text>
              <Text style={styles.partNumber}>P/N: {item.part_number}</Text>
            </View>
            <View style={styles.partQty}>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <Text style={styles.qtyLabel}>Qté</Text>
            </View>
          </View>
          
          <View style={styles.partDetails}>
            {item.serial_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>S/N:</Text>
                <Text style={styles.detailValue}>{item.serial_number}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Installé:</Text>
              <Text style={styles.detailValue}>{formatDate(item.installation_date)}</Text>
            </View>
            {item.installation_airframe_hours && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Heures:</Text>
                <Text style={styles.detailValue}>{item.installation_airframe_hours} h</Text>
              </View>
            )}
            {item.purchase_price && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Prix:</Text>
                <Text style={styles.detailValue}>${item.purchase_price.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Source tag */}
          <View style={styles.sourceRow}>
            <View style={[styles.sourceTag, isOCR ? styles.sourceTagOCR : styles.sourceTagManual]}>
              <Ionicons 
                name={isOCR ? "scan" : "create"} 
                size={12} 
                color={isOCR ? "#3B82F6" : "#10B981"} 
              />
              <Text style={[styles.sourceText, { color: isOCR ? "#3B82F6" : "#10B981" }]}>
                {isOCR ? "OCR" : "Manuel"}
              </Text>
            </View>
            {!isOCR && (
              <View style={styles.protectedNote}>
                <Ionicons name="shield-checkmark" size={12} color="#94A3B8" />
                <Text style={styles.protectedNoteText}>Protégé</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ocrPartsCount = parts.filter(p => p.source === 'ocr').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Pièces</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        
        {/* Bouton mode sélection - visible uniquement si des items OCR existent */}
        {ocrPartsCount > 0 && (
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
        {ocrPartsCount === 0 && (
          <TouchableOpacity onPress={fetchParts} style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color="#1E3A8A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Barre de sélection */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
            <Ionicons 
              name={selectedIds.size === ocrPartsCount ? "checkbox" : "square-outline"} 
              size={20} 
              color="#1E3A8A" 
            />
            <Text style={styles.selectAllText}>
              {selectedIds.size === ocrPartsCount ? 'Tout désélectionner' : 'Tout sélectionner'}
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : parts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="hardware-chip-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Aucune pièce</Text>
          <Text style={styles.emptyText}>
            Les pièces identifiées par OCR apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={parts}
          renderItem={renderPart}
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
  partCard: {
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  partContent: {
    flex: 1,
  },
  partHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partInfo: {
    flex: 1,
    marginLeft: 12,
  },
  partName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  partNumber: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  partQty: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  qtyLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  partDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  sourceTagOCR: {
    backgroundColor: '#EFF6FF',
  },
  sourceTagManual: {
    backgroundColor: '#D1FAE5',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  protectedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  protectedNoteText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
