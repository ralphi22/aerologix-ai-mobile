import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAircraftStore } from '../../../stores/aircraftStore';
import api from '../../../services/api';

interface MaintenanceRecord {
  _id: string;
  maintenance_type: string;
  description: string;
  date_performed: string;
  hours_at_maintenance: number;
}

interface PartRecord {
  _id: string;
  part_name: string;
  part_number: string;
}

// Simple progress bar gauge component
const SimpleGauge = ({
  value,
  maxValue,
  label,
  unit,
  color,
  icon,
  available = true,
}: {
  value: number | null;
  maxValue: number;
  label: string;
  unit: string;
  color: string;
  icon: string;
  available?: boolean;
}) => {
  const displayValue = value !== null ? value : null;
  const percentage = displayValue !== null ? Math.min((displayValue / maxValue) * 100, 100) : 0;

  return (
    <View style={styles.simpleGaugeContainer}>
      <View style={styles.simpleGaugeHeader}>
        <View style={[styles.simpleGaugeIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.simpleGaugeLabel}>{label}</Text>
      </View>
      <View style={styles.simpleGaugeBar}>
        <View 
          style={[
            styles.simpleGaugeProgress, 
            { 
              width: available && displayValue !== null ? `${percentage}%` : '0%', 
              backgroundColor: color 
            }
          ]} 
        />
      </View>
      <View style={styles.simpleGaugeValues}>
        {available && displayValue !== null ? (
          <>
            <Text style={[styles.simpleGaugeValue, { color }]}>{displayValue.toFixed(1)} {unit}</Text>
            <Text style={styles.simpleGaugeMax}>/ {maxValue} {unit}</Text>
          </>
        ) : (
          <Text style={styles.simpleGaugeNA}>Donnée non disponible</Text>
        )}
      </View>
    </View>
  );
};

export default function MaintenanceReportScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();
  const { selectedAircraft, fetchAircraftById } = useAircraftStore();
  
  const [loading, setLoading] = useState(true);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [partsCount, setPartsCount] = useState<number | null>(null);
  const [adsbCount, setAdsbCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [aircraftId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Refresh aircraft data
      if (aircraftId) {
        await fetchAircraftById(aircraftId);
      }

      // Load maintenance records (read-only)
      try {
        const maintenanceRes = await api.get(`/api/maintenance/${aircraftId}`);
        setMaintenanceRecords(maintenanceRes.data || []);
      } catch (e: any) {
        if (e.response?.status !== 404) {
          console.log('Maintenance data not available');
        }
        setMaintenanceRecords([]);
      }

      // Load parts count (read-only)
      try {
        const partsRes = await api.get(`/api/parts/aircraft/${aircraftId}`);
        setPartsCount(partsRes.data?.length || 0);
      } catch (e: any) {
        if (e.response?.status !== 404) {
          console.log('Parts data not available');
        }
        setPartsCount(null);
      }

      // Load AD/SB count (read-only)
      try {
        const adsbRes = await api.get(`/api/adsb/${aircraftId}`);
        setAdsbCount(adsbRes.data?.length || 0);
      } catch (e: any) {
        if (e.response?.status !== 404) {
          console.log('AD/SB data not available');
        }
        setAdsbCount(null);
      }

    } catch (e: any) {
      console.error('Error loading data:', e);
      setError('Données non disponibles pour cet avion');
    } finally {
      setLoading(false);
    }
  };

  // Get values from aircraft data (read-only)
  const airframeHours = selectedAircraft?.airframe_hours ?? null;
  const engineHours = selectedAircraft?.engine_hours ?? null;
  const propellerHours = selectedAircraft?.propeller_hours ?? null;

  // Default TBO values (industry standards)
  const engineTBO = 2000;
  const propellerTBO = 2400;
  const airframeInspection = 100; // 100h inspection cycle

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Rapport Maintenance</Text>
            <Text style={styles.headerSubtitle}>{registration}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Rapport Maintenance</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Dashboard Title */}
        <View style={styles.dashboardHeader}>
          <Ionicons name="speedometer" size={24} color="#1E3A8A" />
          <Text style={styles.dashboardTitle}>Tableau de bord</Text>
        </View>

        {/* Gauges Grid - 6 cadrans */}
        <View style={styles.gaugesGrid}>
          <SimpleGauge
            value={engineHours}
            maxValue={engineTBO}
            label="Moteur"
            unit="h"
            color="#3B82F6"
            icon="cog"
            available={engineHours !== null}
          />
          <SimpleGauge
            value={propellerHours}
            maxValue={propellerTBO}
            label="Hélice"
            unit="h"
            color="#10B981"
            icon="sync"
            available={propellerHours !== null}
          />
          <SimpleGauge
            value={airframeHours !== null ? airframeHours % airframeInspection : null}
            maxValue={airframeInspection}
            label="Cellule (prochain 100h)"
            unit="h"
            color="#8B5CF6"
            icon="airplane"
            available={airframeHours !== null}
          />
          <SimpleGauge
            value={null}
            maxValue={100}
            label="Avionique"
            unit="%"
            color="#F59E0B"
            icon="radio"
            available={false}
          />
          <SimpleGauge
            value={null}
            maxValue={100}
            label="Train/Freins"
            unit="%"
            color="#EF4444"
            icon="disc"
            available={false}
          />
          <SimpleGauge
            value={null}
            maxValue={100}
            label="Divers"
            unit="%"
            color="#6366F1"
            icon="build"
            available={false}
          />
        </View>

        {/* Hours Summary */}
        {(airframeHours !== null || engineHours !== null) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="#1E3A8A" />
              <Text style={styles.sectionTitle}>Heures actuelles</Text>
            </View>
            <View style={styles.hoursCard}>
              <View style={styles.hoursRow}>
                <Text style={styles.hoursLabel}>Cellule (Airframe)</Text>
                <Text style={styles.hoursValue}>
                  {airframeHours !== null ? `${airframeHours.toFixed(1)} h` : '—'}
                </Text>
              </View>
              <View style={styles.hoursRow}>
                <Text style={styles.hoursLabel}>Moteur</Text>
                <Text style={styles.hoursValue}>
                  {engineHours !== null ? `${engineHours.toFixed(1)} h` : '—'}
                </Text>
              </View>
              <View style={[styles.hoursRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.hoursLabel}>Hélice</Text>
                <Text style={styles.hoursValue}>
                  {propellerHours !== null ? `${propellerHours.toFixed(1)} h` : '—'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Cost Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Coût horaire (estimations)</Text>
          </View>
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Coût horaire actuel</Text>
              <Text style={styles.costValue}>—,— $/h</Text>
            </View>
            <View style={[styles.costRow, styles.costRowLast]}>
              <Text style={styles.costLabel}>Projection 12 mois</Text>
              <Text style={styles.costValueProjection}>—,— $/h</Text>
            </View>
          </View>
          <Text style={styles.costNote}>
            Les estimations de coût seront disponibles après l'ajout de données de maintenance.
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Statistiques</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="construct" size={24} color="#3B82F6" />
              <Text style={styles.statValue}>
                {maintenanceRecords.length > 0 ? maintenanceRecords.length : '—'}
              </Text>
              <Text style={styles.statLabel}>Maintenances</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.statValue}>
                {adsbCount !== null ? adsbCount : '—'}
              </Text>
              <Text style={styles.statLabel}>AD/SB</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="hardware-chip" size={24} color="#10B981" />
              <Text style={styles.statValue}>
                {partsCount !== null ? partsCount : '—'}
              </Text>
              <Text style={styles.statLabel}>Pièces</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  contentContainer: {
    padding: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  gaugesGrid: {
    gap: 12,
    marginBottom: 24,
  },
  simpleGaugeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  simpleGaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  simpleGaugeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleGaugeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  simpleGaugeBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  simpleGaugeProgress: {
    height: '100%',
    borderRadius: 4,
  },
  simpleGaugeValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  simpleGaugeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  simpleGaugeMax: {
    fontSize: 14,
    color: '#94A3B8',
  },
  simpleGaugeNA: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  hoursCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  hoursLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  costCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  costRowLast: {
    borderBottomWidth: 0,
  },
  costLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  costValueProjection: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  costNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
