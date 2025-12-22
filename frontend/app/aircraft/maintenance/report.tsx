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

// Circular gauge component (without svg library)
const CircularGauge = ({
  value,
  maxValue,
  label,
  unit,
  color,
  size = 100,
}: {
  value: number;
  maxValue: number;
  label: string;
  unit: string;
  color: string;
  size?: number;
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.gaugeContainer, { width: size, height: size + 40 }]}>
      <View style={[styles.gaugeOuter, { width: size, height: size, borderRadius: size / 2, borderColor: '#E2E8F0' }]}>
        <View
          style={[
            styles.gaugeProgress,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color,
              borderWidth: strokeWidth,
              transform: [{ rotate: '-90deg' }],
            },
          ]}
        />
        <View style={styles.gaugeInner}>
          <Text style={[styles.gaugeValue, { color }]}>{value}</Text>
          <Text style={styles.gaugeUnit}>{unit}</Text>
        </View>
      </View>
      <Text style={styles.gaugeLabel}>{label}</Text>
    </View>
  );
};

// Simple progress bar gauge
const SimpleGauge = ({
  value,
  maxValue,
  label,
  unit,
  color,
  icon,
}: {
  value: number;
  maxValue: number;
  label: string;
  unit: string;
  color: string;
  icon: string;
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <View style={styles.simpleGaugeContainer}>
      <View style={styles.simpleGaugeHeader}>
        <View style={[styles.simpleGaugeIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.simpleGaugeLabel}>{label}</Text>
      </View>
      <View style={styles.simpleGaugeBar}>
        <View style={[styles.simpleGaugeProgress, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.simpleGaugeValues}>
        <Text style={[styles.simpleGaugeValue, { color }]}>{value} {unit}</Text>
        <Text style={styles.simpleGaugeMax}>/ {maxValue} {unit}</Text>
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
  const { selectedAircraft } = useAircraftStore();

  // Placeholder data - would come from actual maintenance records
  const maintenanceData = {
    engine: {
      hours: selectedAircraft?.engine_hours || 0,
      tbo: 2000,
      label: 'Moteur',
    },
    propeller: {
      hours: selectedAircraft?.propeller_hours || 0,
      tbo: 2400,
      label: 'Hélice',
    },
    airframe: {
      hours: selectedAircraft?.airframe_hours || 0,
      inspection: 100,
      label: 'Cellule',
    },
    avionics: {
      status: 85,
      max: 100,
      label: 'Avionique',
    },
    landing: {
      status: 70,
      max: 100,
      label: 'Train/Freins',
    },
    misc: {
      status: 90,
      max: 100,
      label: 'Divers',
    },
  };

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

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Dashboard Title */}
        <View style={styles.dashboardHeader}>
          <Ionicons name="speedometer" size={24} color="#1E3A8A" />
          <Text style={styles.dashboardTitle}>Tableau de bord</Text>
        </View>

        {/* Gauges Grid */}
        <View style={styles.gaugesGrid}>
          <SimpleGauge
            value={maintenanceData.engine.hours}
            maxValue={maintenanceData.engine.tbo}
            label={maintenanceData.engine.label}
            unit="h"
            color="#3B82F6"
            icon="cog"
          />
          <SimpleGauge
            value={maintenanceData.propeller.hours}
            maxValue={maintenanceData.propeller.tbo}
            label={maintenanceData.propeller.label}
            unit="h"
            color="#10B981"
            icon="sync"
          />
          <SimpleGauge
            value={maintenanceData.airframe.hours % maintenanceData.airframe.inspection}
            maxValue={maintenanceData.airframe.inspection}
            label={maintenanceData.airframe.label}
            unit="h"
            color="#8B5CF6"
            icon="airplane"
          />
          <SimpleGauge
            value={maintenanceData.avionics.status}
            maxValue={maintenanceData.avionics.max}
            label={maintenanceData.avionics.label}
            unit="%"
            color="#F59E0B"
            icon="radio"
          />
          <SimpleGauge
            value={maintenanceData.landing.status}
            maxValue={maintenanceData.landing.max}
            label={maintenanceData.landing.label}
            unit="%"
            color="#EF4444"
            icon="disc"
          />
          <SimpleGauge
            value={maintenanceData.misc.status}
            maxValue={maintenanceData.misc.max}
            label={maintenanceData.misc.label}
            unit="%"
            color="#6366F1"
            icon="build"
          />
        </View>

        {/* Cost Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Coût horaire (estimations)</Text>
          </View>
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Coût horaire actuel</Text>
              <Text style={styles.costValue}>--,-- $/h</Text>
            </View>
            <View style={[styles.costRow, styles.costRowLast]}>
              <Text style={styles.costLabel}>Projection 12 mois</Text>
              <Text style={styles.costValueProjection}>--,-- $/h</Text>
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
            <Text style={styles.sectionTitle}>Statistiques rapides</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="construct" size={24} color="#3B82F6" />
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Maintenances</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>AD/SB actifs</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="hardware-chip" size={24} color="#10B981" />
              <Text style={styles.statValue}>--</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  contentContainer: {
    padding: 16,
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
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeOuter: {
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeProgress: {
    position: 'absolute',
  },
  gaugeInner: {
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  gaugeUnit: {
    fontSize: 12,
    color: '#64748B',
  },
  gaugeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
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
