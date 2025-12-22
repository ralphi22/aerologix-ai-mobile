import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
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
}

export default function MaintenancePartsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

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

  const renderPart = ({ item }: { item: Part }) => (
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
      {item.source === 'ocr' && (
        <View style={styles.sourceTag}>
          <Ionicons name="scan" size={12} color="#3B82F6" />
          <Text style={styles.sourceText}>OCR</Text>
        </View>
      )}
    </View>
  );

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
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 12,
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
