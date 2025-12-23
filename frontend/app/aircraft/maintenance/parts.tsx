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
      console.log('[PARTS] Fetching parts for aircraft:', aircraftId);
      const response = await api.get(`/api/parts/aircraft/${aircraftId}`);
      console.log('[PARTS] Fetched', response.data?.length || 0, 'parts');
      setParts(response.data || []);
    } catch (error) {
      console.error('[PARTS] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-CA');
  };

  // SUPPRESSION DIRECTE D'UNE PIÈCE
  const handleDeletePart = (part: Part) => {
    console.log('[ACTION] delete pressed', { screen: 'Parts', partId: part._id, partNumber: part.part_number });
    
    // Vérifier si OCR
    if (part.source !== 'ocr') {
      console.log('[ACTION] blocked - not OCR source');
      Alert.alert('Suppression interdite', 'Seules les pièces OCR peuvent être supprimées.');
      return;
    }

    const performDelete = async () => {
      console.log('[ACTION] performDelete called for:', part._id);
      setDeletingId(part._id);
      
      try {
        const url = `/api/parts/record/${part._id}`;
        console.log('[ACTION] calling API DELETE:', url);
        
        const response = await api.delete(url);
        console.log('[ACTION] delete result', { ok: true, status: response.status });
        
        // Succès - mettre à jour la liste
        setParts(prev => {
          const newList = prev.filter(p => p._id !== part._id);
          console.log('[ACTION] list updated, remaining:', newList.length);
          return newList;
        });
        
        Alert.alert('Succès', 'Pièce supprimée');
      } catch (error: any) {
        console.log('[ACTION] delete result', { ok: false, status: error.response?.status, error: error.message });
        
        let message = 'Erreur lors de la suppression';
        if (error.response?.status === 401) {
          message = 'Session expirée. Reconnectez-vous.';
        } else if (error.response?.status === 403) {
          message = 'Action non autorisée';
        } else if (error.response?.status === 404) {
          message = 'Pièce introuvable';
        } else if (error.response?.data?.detail) {
          message = error.response.data.detail;
        }
        
        Alert.alert('Erreur', message);
      } finally {
        setDeletingId(null);
      }
    };

    // Confirmation
    Alert.alert(
      'Supprimer cette pièce ?',
      `${part.part_number}\n\nAction irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: performDelete }
      ]
    );
  };

  const renderPart = ({ item }: { item: Part }) => {
    const isOCR = item.source === 'ocr';
    const isDeleting = deletingId === item._id;
    
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
        </View>

        {/* Footer avec source et bouton delete */}
        <View style={styles.footer}>
          <View style={[styles.sourceTag, isOCR ? styles.sourceOCR : styles.sourceManual]}>
            <Ionicons name={isOCR ? "scan" : "create"} size={12} color={isOCR ? "#3B82F6" : "#10B981"} />
            <Text style={[styles.sourceText, { color: isOCR ? "#3B82F6" : "#10B981" }]}>
              {isOCR ? "OCR" : "Manuel"}
            </Text>
          </View>
          
          {isOCR ? (
            <TouchableOpacity
              style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
              onPress={() => handleDeletePart(item)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Supprimer</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.protectedBadge}>
              <Ionicons name="lock-closed" size={12} color="#94A3B8" />
              <Text style={styles.protectedText}>Protégé</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Pièces</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity onPress={fetchParts} style={styles.headerBtn}>
          <Ionicons name="refresh" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : parts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="hardware-chip-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Aucune pièce</Text>
          <Text style={styles.emptyText}>Les pièces OCR apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={parts}
          renderItem={renderPart}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 8 },
  list: { padding: 16 },
  partCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partHeader: { flexDirection: 'row', alignItems: 'center' },
  partIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center', alignItems: 'center',
  },
  partInfo: { flex: 1, marginLeft: 12 },
  partName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  partNumber: { fontSize: 13, color: '#64748B', marginTop: 2 },
  partQty: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  qtyValue: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  qtyLabel: { fontSize: 10, color: '#64748B' },
  partDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: '#64748B' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sourceTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, gap: 4 },
  sourceOCR: { backgroundColor: '#EFF6FF' },
  sourceManual: { backgroundColor: '#D1FAE5' },
  sourceText: { fontSize: 11, fontWeight: '500' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, gap: 6,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  protectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  protectedText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
});
