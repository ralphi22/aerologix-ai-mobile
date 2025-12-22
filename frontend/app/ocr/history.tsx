import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';

interface OCRScan {
  id: string;
  status: string;
  document_type: string;
  created_at: string;
  extracted_data?: {
    ad_sb_references?: any[];
    parts_replaced?: any[];
  };
}

export default function OCRHistoryScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [scans, setScans] = useState<OCRScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await api.get(`/api/ocr/history/${aircraftId}`);
      setScans(response.data);
    } catch (error) {
      console.error('Error fetching OCR history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'logbook':
        return 'Logbook';
      case 'invoice':
        return 'Facture';
      case 'work_order':
        return 'Work Order';
      case 'ad_compliance':
        return 'AD Compliance';
      case 'sb_compliance':
        return 'SB Compliance';
      case 'stc':
        return 'STC';
      case 'maintenance_report':
        return 'Rapport maintenance';
      case 'other':
        return 'Autre';
      default:
        return type;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'logbook':
        return 'book-outline';
      case 'invoice':
        return 'receipt-outline';
      case 'work_order':
        return 'construct-outline';
      case 'ad_compliance':
        return 'alert-circle-outline';
      case 'sb_compliance':
        return 'warning-outline';
      case 'stc':
        return 'document-text-outline';
      case 'maintenance_report':
        return 'construct-outline';
      case 'other':
        return 'folder-outline';
      default:
        return 'document-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#10B981';
      case 'APPLIED':
        return '#3B82F6';
      case 'FAILED':
        return '#EF4444';
      case 'PROCESSING':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Analysé';
      case 'APPLIED':
        return 'Appliqué';
      case 'FAILED':
        return 'Échec';
      case 'PROCESSING':
        return 'En cours';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderScanItem = ({ item }: { item: OCRScan }) => (
    <TouchableOpacity
      style={styles.scanCard}
      onPress={() =>
        router.push({
          pathname: '/ocr/results',
          params: {
            scanId: item.id,
            aircraftId,
            registration,
            rawText: '',
            extractedData: JSON.stringify(item.extracted_data || {}),
            documentType: item.document_type,
          },
        })
      }
    >
      <View style={styles.scanIcon}>
        <Ionicons
          name={getDocumentTypeIcon(item.document_type) as any}
          size={24}
          color="#1E3A8A"
        />
      </View>
      <View style={styles.scanContent}>
        <Text style={styles.scanType}>{getDocumentTypeLabel(item.document_type)}</Text>
        <Text style={styles.scanDate}>{formatDate(item.created_at)}</Text>
        <View style={styles.scanStats}>
          {item.extracted_data?.ad_sb_references?.length ? (
            <Text style={styles.scanStat}>
              {item.extracted_data.ad_sb_references.length} AD/SB
            </Text>
          ) : null}
          {item.extracted_data?.parts_replaced?.length ? (
            <Text style={styles.scanStat}>
              {item.extracted_data.parts_replaced.length} pièces
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {getStatusLabel(item.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Historique OCR</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push({
              pathname: '/ocr/scan',
              params: { aircraftId, registration },
            })
          }
        >
          <Ionicons name="add" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Aucun scan OCR</Text>
          <Text style={styles.emptyText}>
            Scannez vos documents de maintenance pour extraire automatiquement les informations.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() =>
              router.push({
                pathname: '/ocr/scan',
                params: { aircraftId, registration },
              })
            }
          >
            <Ionicons name="scan" size={20} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Scanner un document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={scans}
          renderItem={renderScanItem}
          keyExtractor={(item) => item.id}
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
    backgroundColor: '#FFFFFF',
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanContent: {
    flex: 1,
    marginLeft: 12,
  },
  scanType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  scanDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scanStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  scanStat: {
    fontSize: 12,
    color: '#3B82F6',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
