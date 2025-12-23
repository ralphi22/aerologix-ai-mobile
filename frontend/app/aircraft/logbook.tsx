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
import api from '../../services/api';

interface LogEntry {
  _id: string;
  date: string;
  flight_time: number;
  departure?: string;
  arrival?: string;
  pilot?: string;
  remarks?: string;
}

export default function LogBookScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogBook();
  }, []);

  const fetchLogBook = async () => {
    try {
      // Essayer de récupérer les entrées du logbook si l'endpoint existe
      const response = await api.get(`/api/logbook/${aircraftId}`);
      setEntries(response.data || []);
    } catch (error) {
      // Endpoint non disponible, liste vide
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA');
  };

  const renderEntry = ({ item }: { item: LogEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.dateTag}>
          <Ionicons name="calendar" size={14} color="#3B82F6" />
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
        <Text style={styles.flightTime}>{item.flight_time}h</Text>
      </View>
      {(item.departure || item.arrival) && (
        <View style={styles.routeRow}>
          <Text style={styles.routeText}>
            {item.departure || '—'} → {item.arrival || '—'}
          </Text>
        </View>
      )}
      {item.pilot && (
        <View style={styles.pilotRow}>
          <Ionicons name="person" size={14} color="#64748B" />
          <Text style={styles.pilotText}>{item.pilot}</Text>
        </View>
      )}
      {item.remarks && (
        <Text style={styles.remarks}>{item.remarks}</Text>
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
          <Text style={styles.headerTitle}>Log Book</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity onPress={fetchLogBook} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Log Book vide</Text>
          <Text style={styles.emptyText}>
            Les entrées de vol apparaîtront ici.{"\n"}
            Utilisez le Scanner OCR pour importer des données.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
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
    lineHeight: 22,
  },
  listContainer: {
    padding: 16,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  flightTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  routeRow: {
    marginTop: 12,
  },
  routeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  pilotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  pilotText: {
    fontSize: 14,
    color: '#64748B',
  },
  remarks: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
