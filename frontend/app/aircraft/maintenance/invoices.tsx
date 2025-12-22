import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
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
  id?: string;
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (aircraftId) {
      fetchInvoices();
    }
  }, [aircraftId]);

  const fetchInvoices = async () => {
    try {
      const response = await api.get(`/api/invoices/aircraft/${aircraftId}`);
      setInvoices(response.data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      // 404 is expected if no invoices
      if (error.response?.status !== 404) {
        setInvoices([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount?: number, currency: string = 'CAD') => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Factures</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Aucune facture</Text>
          <Text style={styles.emptyText}>
            Les factures scannées via OCR apparaîtront ici.
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => router.push({
              pathname: '/ocr/scan',
              params: { aircraftId, registration }
            })}
          >
            <Ionicons name="scan" size={20} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Scanner une facture</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{invoices.length} facture{invoices.length > 1 ? 's' : ''}</Text>
          </View>

          {invoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceIconContainer}>
                  <Ionicons name="receipt" size={24} color="#10B981" />
                </View>
                <View style={styles.invoiceHeaderContent}>
                  <Text style={styles.invoiceNumber}>
                    {invoice.invoice_number || 'Sans numéro'}
                  </Text>
                  <Text style={styles.invoiceDate}>
                    {formatDate(invoice.invoice_date)}
                  </Text>
                </View>
                <View style={styles.invoiceTotalContainer}>
                  <Text style={styles.invoiceTotal}>
                    {formatCurrency(invoice.total, invoice.currency)}
                  </Text>
                </View>
              </View>

              {invoice.supplier && (
                <View style={styles.supplierRow}>
                  <Ionicons name="business-outline" size={16} color="#64748B" />
                  <Text style={styles.supplierText}>{invoice.supplier}</Text>
                </View>
              )}

              {invoice.parts && invoice.parts.length > 0 && (
                <View style={styles.partsContainer}>
                  <Text style={styles.partsTitle}>
                    {invoice.parts.length} pièce{invoice.parts.length > 1 ? 's' : ''}
                  </Text>
                  {invoice.parts.slice(0, 3).map((part, index) => (
                    <View key={index} style={styles.partRow}>
                      <Text style={styles.partNumber}>{part.part_number}</Text>
                      <Text style={styles.partQty}>x{part.quantity}</Text>
                      {part.total_price && (
                        <Text style={styles.partPrice}>
                          {formatCurrency(part.total_price, invoice.currency)}
                        </Text>
                      )}
                    </View>
                  ))}
                  {invoice.parts.length > 3 && (
                    <Text style={styles.moreParts}>
                      +{invoice.parts.length - 3} autre{invoice.parts.length - 3 > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.sourceRow}>
                <Ionicons 
                  name={invoice.source === 'ocr' ? 'scan' : 'create'} 
                  size={12} 
                  color="#94A3B8" 
                />
                <Text style={styles.sourceText}>
                  {invoice.source === 'ocr' ? 'Importé via OCR' : 'Saisie manuelle'}
                </Text>
              </View>
            </View>
          ))}

          <View style={{ height: 24 }} />
        </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  listHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
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
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invoiceHeaderContent: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  invoiceDate: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  invoiceTotalContainer: {
    alignItems: 'flex-end',
  },
  invoiceTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  supplierText: {
    fontSize: 13,
    color: '#64748B',
  },
  partsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  partsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  partNumber: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    fontFamily: 'monospace',
  },
  partQty: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 12,
  },
  partPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  moreParts: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  sourceText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
