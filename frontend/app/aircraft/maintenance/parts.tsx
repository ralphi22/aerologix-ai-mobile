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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Vérifie si une pièce peut être supprimée (OCR non confirmée uniquement)
  const canDelete = (part: Part): boolean => {
    return part.source === 'ocr' && part.confirmed === false;
  };

  const handleDelete = async (part: Part) => {
    if (!canDelete(part)) {
      const message = part.source !== 'ocr' 
        ? 'Les pièces saisies manuellement ne peuvent pas être supprimées.'
        : 'Pièce confirmée — suppression désactivée. Utilisez "Corriger" ou "Marquer comme erreur".';
      
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Suppression interdite', message);
      }
      return;
    }

    const confirmDelete = async () => {
      setDeletingId(part._id);
      try {
        await api.delete(`/api/parts/record/${part._id}`);
        setParts(parts.filter(p => p._id !== part._id));
        
        if (Platform.OS === 'web') {
          window.alert('Pièce supprimée avec succès');
        } else {
          Alert.alert('Succès', 'Pièce supprimée avec succès');
        }
      } catch (error: any) {
        console.error('Delete error:', error);
        const message = error.response?.data?.detail || 'Erreur lors de la suppression';
        if (Platform.OS === 'web') {
          window.alert('Erreur: ' + message);
        } else {
          Alert.alert('Erreur', message);
        }
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer la pièce ${part.part_number} ?\n\nCette action est irréversible.`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirmer la suppression',
        `Supprimer la pièce ${part.part_number} ?\n\nCette action est irréversible.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  const handleConfirm = async (part: Part) => {
    try {
      await api.put(`/api/parts/record/${part._id}/confirm`);
      // Mettre à jour l'état local
      setParts(parts.map(p => 
        p._id === part._id ? { ...p, confirmed: true } : p
      ));
      
      if (Platform.OS === 'web') {
        window.alert('Pièce confirmée avec succès');
      } else {
        Alert.alert('Succès', 'Pièce confirmée avec succès');
      }
    } catch (error: any) {
      console.error('Confirm error:', error);
      const message = error.response?.data?.detail || 'Erreur lors de la confirmation';
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + message);
      } else {
        Alert.alert('Erreur', message);
      }
    }
  };

  const renderPart = ({ item }: { item: Part }) => {
    const deletable = canDelete(item);
    const isOCR = item.source === 'ocr';
    const isConfirmed = item.confirmed !== false; // Default to true for safety
    
    return (
      <View style={styles.partCard}>
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

        {/* Source et statut */}
        <View style={styles.statusRow}>
          {isOCR && (
            <View style={[
              styles.sourceTag,
              isConfirmed ? styles.sourceTagConfirmed : styles.sourceTagPending
            ]}>
              <Ionicons 
                name={isConfirmed ? "checkmark-circle" : "scan"} 
                size={12} 
                color={isConfirmed ? "#10B981" : "#F59E0B"} 
              />
              <Text style={[
                styles.sourceText,
                { color: isConfirmed ? "#10B981" : "#F59E0B" }
              ]}>
                {isConfirmed ? "OCR Confirmé" : "OCR Non confirmé"}
              </Text>
            </View>
          )}
          {!isOCR && (
            <View style={styles.sourceTag}>
              <Ionicons name="create" size={12} color="#3B82F6" />
              <Text style={styles.sourceText}>Manuel</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {isOCR && !isConfirmed && (
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => handleConfirm(item)}
            >
              <Ionicons name="checkmark" size={16} color="#10B981" />
              <Text style={styles.confirmButtonText}>Confirmer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.deleteButton, deletingId === item._id && styles.deleteButtonDisabled]}
              onPress={() => handleDelete(item)}
              disabled={deletingId === item._id}
            >
              {deletingId === item._id ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Supprimer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Message pour pièces confirmées */}
        {isOCR && isConfirmed && (
          <View style={styles.confirmedNote}>
            <Ionicons name="lock-closed" size={12} color="#94A3B8" />
            <Text style={styles.confirmedNoteText}>
              Pièce confirmée — suppression désactivée
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Pièces</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity onPress={fetchParts} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
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
  statusRow: {
    flexDirection: 'row',
    marginTop: 12,
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
  sourceTagConfirmed: {
    backgroundColor: '#D1FAE5',
  },
  sourceTagPending: {
    backgroundColor: '#FEF3C7',
  },
  sourceText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  confirmedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  confirmedNoteText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
