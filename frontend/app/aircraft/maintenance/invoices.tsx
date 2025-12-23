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
  const [deleting, setDeleting] = useState(false);
  
  // Mode sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      if (error.response?.status !== 404) {
        setInvoices([]);
      }
    } finally {
      setLoading(false);
    }
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
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map(i => i._id)));
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
          await api.delete(`/api/invoices/${id}`);
          deleted.push(id);
        } catch (error: any) {
          const status = error.response?.status;
          if (status === 401 || status === 403) {
            errors.push(`Authentification requise`);
            break;
          } else if (status === 404) {
            errors.push(`Facture introuvable: ${id}`);
          } else {
            errors.push(error.response?.data?.detail || `Erreur: ${id}`);
          }
        }
      }

      // Mettre à jour l'UI
      if (deleted.length > 0) {
        setInvoices(prev => prev.filter(i => !deleted.includes(i._id)));
        setSelectedIds(new Set());
      }

      setDeleting(false);
      setSelectionMode(false);

      // Afficher le résultat
      if (errors.length > 0) {
        const message = `${deleted.length} supprimée(s)\n${errors.length} erreur(s):\n${errors.join('\n')}`;
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Résultat', message);
        }
      } else {
        const message = `${deleted.length} facture(s) supprimée(s)`;
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Succès', message);
        }
      }
    };

    // Confirmation
    const message = `Supprimer ${count} facture(s) ?\n\nCette action est irréversible.`;
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

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const isSelected = selectedIds.has(item._id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.invoiceCard,
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

        <View style={styles.invoiceContent}>
          <View style={styles.invoiceHeader}>
            <View style={styles.invoiceIconContainer}>
              <Ionicons name="receipt" size={24} color="#10B981" />
            </View>
            <View style={styles.invoiceHeaderContent}>
              <Text style={styles.invoiceNumber}>
                {item.invoice_number || 'Sans numéro'}
              </Text>
              <Text style={styles.invoiceDate}>
                {formatDate(item.invoice_date)}
              </Text>
            </View>
            <View style={styles.invoiceTotalContainer}>
              <Text style={styles.invoiceTotal}>
                {formatCurrency(item.total, item.currency)}
              </Text>
            </View>
          </View>

          {item.supplier && (
            <View style={styles.supplierRow}>
              <Ionicons name="business-outline" size={16} color="#64748B" />
              <Text style={styles.supplierText}>{item.supplier}</Text>
            </View>
          )}

          {item.parts && item.parts.length > 0 && (
            <View style={styles.partsContainer}>
              <Text style={styles.partsTitle}>
                {item.parts.length} pièce{item.parts.length > 1 ? 's' : ''}
              </Text>
              {item.parts.slice(0, 3).map((part, index) => (
                <View key={index} style={styles.partRow}>
                  <Text style={styles.partNumber}>{part.part_number}</Text>
                  <Text style={styles.partQty}>x{part.quantity}</Text>
                  {part.total_price && (
                    <Text style={styles.partPrice}>
                      {formatCurrency(part.total_price, item.currency)}
                    </Text>
                  )}
                </View>
              ))}
              {item.parts.length > 3 && (
                <Text style={styles.moreParts}>
                  +{item.parts.length - 3} autre{item.parts.length - 3 > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}

          <View style={styles.sourceRow}>
            <View style={styles.sourceTag}>
              <Ionicons 
                name={item.source === 'ocr' ? 'scan' : 'create'} 
                size={12} 
                color="#94A3B8" 
              />
              <Text style={styles.sourceText}>
                {item.source === 'ocr' ? 'OCR' : 'Manuel'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Factures</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        
        {invoices.length > 0 && (
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
        {invoices.length === 0 && <View style={{ width: 40 }} />}
      </View>

      {/* Barre de sélection */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
            <Ionicons 
              name={selectedIds.size === invoices.length ? "checkbox" : "square-outline"} 
              size={20} 
              color="#1E3A8A" 
            />
            <Text style={styles.selectAllText}>
              {selectedIds.size === invoices.length ? 'Tout désélectionner' : 'Tout sélectionner'}
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
        <FlatList
          data={invoices}
          renderItem={renderInvoice}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            !selectionMode ? (
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{invoices.length} facture{invoices.length > 1 ? 's' : ''}</Text>
              </View>
            ) : null
          }
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
  listContainer: {
    padding: 16,
  },
  listHeader: {
    marginBottom: 8,
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
    paddingTop: 10,
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
  invoiceContent: {
    flex: 1,
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
