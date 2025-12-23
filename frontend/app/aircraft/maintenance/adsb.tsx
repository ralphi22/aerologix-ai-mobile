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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      console.log('[ADSB] Fetching for aircraft:', aircraftId);
      const response = await api.get(`/api/adsb/${aircraftId}`);
      console.log('[ADSB] Fetched', response.data?.length || 0, 'records');
      setRecords(response.data || []);
    } catch (error) {
      console.error('[ADSB] Fetch error:', error);
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
      case 'COMPLIED': return '#10B981';
      case 'PENDING': return '#F59E0B';
      case 'NOT_APPLICABLE': return '#6B7280';
      default: return '#94A3B8';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLIED': return 'Conforme';
      case 'PENDING': return 'En attente';
      case 'NOT_APPLICABLE': return 'N/A';
      default: return status || '—';
    }
  };

  const getTypeColor = (type: string) => type === 'AD' ? '#EF4444' : '#F59E0B';

  // SUPPRESSION DIRECTE
  const handleDelete = (item: ADSB) => {
    console.log('[ACTION] delete pressed', { screen: 'ADSB', itemId: item._id, ref: item.reference_number });

    const performDelete = async () => {
      console.log('[ACTION] performDelete called for:', item._id);
      setDeletingId(item._id);
      
      try {
        const url = `/api/adsb/record/${item._id}`;
        console.log('[ACTION] calling API DELETE:', url);
        
        const response = await api.delete(url);
        console.log('[ACTION] delete result', { ok: true, status: response.status });
        
        setRecords(prev => {
          const newList = prev.filter(r => r._id !== item._id);
          console.log('[ACTION] list updated, remaining:', newList.length);
          return newList;
        });
        
        Alert.alert('Succès', 'AD/SB supprimé');
      } catch (error: any) {
        console.log('[ACTION] delete result', { ok: false, status: error.response?.status });
        
        let message = 'Erreur lors de la suppression';
        if (error.response?.status === 401) message = 'Session expirée';
        else if (error.response?.status === 404) message = 'Élément introuvable';
        else if (error.response?.data?.detail) message = error.response.data.detail;
        
        Alert.alert('Erreur', message);
      } finally {
        setDeletingId(null);
      }
    };

    Alert.alert(
      'Supprimer cet AD/SB ?',
      `${item.adsb_type} ${item.reference_number}\n\nAction irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: performDelete }
      ]
    );
  };

  const renderRecord = ({ item }: { item: ADSB }) => {
    const isDeleting = deletingId === item._id;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeTag, { backgroundColor: getTypeColor(item.adsb_type) + '20' }]}>
            <Text style={[styles.typeText, { color: getTypeColor(item.adsb_type) }]}>{item.adsb_type}</Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        
        <Text style={styles.refNumber}>{item.reference_number}</Text>
        {item.title && <Text style={styles.title}>{item.title}</Text>}
        {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
        
        <View style={styles.details}>
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

        <View style={styles.footer}>
          {item.source === 'ocr' && (
            <View style={styles.sourceTag}>
              <Ionicons name="scan" size={12} color="#3B82F6" />
              <Text style={styles.sourceText}>OCR</Text>
            </View>
          )}
          {!item.source && <View />}
          
          <TouchableOpacity
            style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
            onPress={() => handleDelete(item)}
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
        </View>
      </View>
    );
  };

  const adCount = records.filter(r => r.adsb_type === 'AD').length;
  const sbCount = records.filter(r => r.adsb_type === 'SB').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AD/SB</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity onPress={fetchRecords} style={styles.headerBtn}>
          <Ionicons name="refresh" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {!loading && records.length > 0 && (
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
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Aucun AD/SB</Text>
          <Text style={styles.emptyText}>Les AD/SB OCR apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  summaryBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, backgroundColor: '#F8FAFC',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  summaryItem: { alignItems: 'center', paddingHorizontal: 24 },
  summaryCount: { fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, color: '#64748B' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 8 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  typeText: { fontSize: 12, fontWeight: '700' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  refNumber: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  title: { fontSize: 14, fontWeight: '500', color: '#1E293B', marginTop: 4 },
  desc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  details: { flexDirection: 'row', marginTop: 12, gap: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: '#64748B' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  sourceTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, gap: 4,
  },
  sourceText: { fontSize: 11, color: '#3B82F6', fontWeight: '500' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEE2E2', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, gap: 6,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});
