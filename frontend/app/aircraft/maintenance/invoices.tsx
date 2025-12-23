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

interface InvoicePart {
  part_number: string;
  name?: string;
  quantity: number;
  total_price?: number;
}

interface Invoice {
  _id: string;
  invoice_number?: string;
  invoice_date?: string;
  supplier?: string;
  parts: InvoicePart[];
  total?: number;
  currency: string;
  source: string;
  created_at: string;
}

export default function MaintenanceInvoicesScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (aircraftId) fetchInvoices();
  }, [aircraftId]);

  const fetchInvoices = async () => {
    try {
      console.log('[INVOICES] Fetching for aircraft:', aircraftId);
      const response = await api.get(`/api/invoices/aircraft/${aircraftId}`);
      console.log('[INVOICES] Fetched', response.data?.length || 0, 'invoices');
      setInvoices(response.data || []);
    } catch (error: any) {
      console.error('[INVOICES] Fetch error:', error);
      if (error.response?.status !== 404) setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatCurrency = (amount?: number, currency: string = 'CAD') => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(amount);
  };

  // SUPPRESSION DIRECTE
  const handleDelete = (invoice: Invoice) => {
    console.log('[ACTION] delete pressed', { screen: 'Invoices', invoiceId: invoice._id, number: invoice.invoice_number });

    const performDelete = async () => {
      console.log('[ACTION] performDelete called for:', invoice._id);
      setDeletingId(invoice._id);
      
      try {
        const url = `/api/invoices/${invoice._id}`;
        console.log('[ACTION] calling API DELETE:', url);
        
        const response = await api.delete(url);
        console.log('[ACTION] delete result', { ok: true, status: response.status });
        
        setInvoices(prev => {
          const newList = prev.filter(i => i._id !== invoice._id);
          console.log('[ACTION] list updated, remaining:', newList.length);
          return newList;
        });
        
        Alert.alert('Succès', 'Facture supprimée');
      } catch (error: any) {
        console.log('[ACTION] delete result', { ok: false, status: error.response?.status });
        
        let message = 'Erreur lors de la suppression';
        if (error.response?.status === 401) message = 'Session expirée';
        else if (error.response?.status === 404) message = 'Facture introuvable';
        else if (error.response?.data?.detail) message = error.response.data.detail;
        
        Alert.alert('Erreur', message);
      } finally {
        setDeletingId(null);
      }
    };

    Alert.alert(
      'Supprimer cette facture ?',
      `${invoice.invoice_number || 'Sans numéro'}\n\nAction irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => { performDelete(); } }
      ]
    );
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const isDeleting = deletingId === item._id;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="receipt" size={24} color="#10B981" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.invoiceNumber}>{item.invoice_number || 'Sans numéro'}</Text>
            <Text style={styles.invoiceDate}>{formatDate(item.invoice_date)}</Text>
          </View>
          <Text style={styles.total}>{formatCurrency(item.total, item.currency)}</Text>
        </View>

        {item.supplier && (
          <View style={styles.supplierRow}>
            <Ionicons name="business-outline" size={16} color="#64748B" />
            <Text style={styles.supplierText}>{item.supplier}</Text>
          </View>
        )}

        {item.parts && item.parts.length > 0 && (
          <View style={styles.partsContainer}>
            <Text style={styles.partsTitle}>{item.parts.length} pièce{item.parts.length > 1 ? 's' : ''}</Text>
            {item.parts.slice(0, 2).map((part, index) => (
              <View key={index} style={styles.partRow}>
                <Text style={styles.partNumber}>{part.part_number}</Text>
                <Text style={styles.partQty}>x{part.quantity}</Text>
              </View>
            ))}
            {item.parts.length > 2 && (
              <Text style={styles.moreParts}>+{item.parts.length - 2} autre{item.parts.length - 2 > 1 ? 's' : ''}</Text>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.sourceTag}>
            <Ionicons name={item.source === 'ocr' ? 'scan' : 'create'} size={12} color="#94A3B8" />
            <Text style={styles.sourceText}>{item.source === 'ocr' ? 'OCR' : 'Manuel'}</Text>
          </View>
          
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Factures</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity onPress={fetchInvoices} style={styles.headerBtn}>
          <Ionicons name="refresh" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Aucune facture</Text>
          <Text style={styles.emptyText}>Les factures OCR apparaîtront ici</Text>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => router.push({ pathname: '/ocr/scan', params: { aircraftId, registration } })}
          >
            <Ionicons name="scan" size={20} color="#FFFFFF" />
            <Text style={styles.scanBtnText}>Scanner une facture</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={invoices}
          renderItem={renderInvoice}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={<Text style={styles.listHeader}>{invoices.length} facture{invoices.length > 1 ? 's' : ''}</Text>}
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 8, textAlign: 'center' },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, marginTop: 24, gap: 8,
  },
  scanBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  list: { padding: 16 },
  listHeader: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerContent: { flex: 1 },
  invoiceNumber: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  invoiceDate: { fontSize: 13, color: '#64748B', marginTop: 2 },
  total: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  supplierRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  supplierText: { fontSize: 13, color: '#64748B' },
  partsContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  partsTitle: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 8 },
  partRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  partNumber: { flex: 1, fontSize: 13, color: '#1E293B', fontFamily: 'monospace' },
  partQty: { fontSize: 13, color: '#64748B' },
  moreParts: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 4 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  sourceTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, gap: 4,
  },
  sourceText: { fontSize: 11, color: '#94A3B8' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEE2E2', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, gap: 6,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});
