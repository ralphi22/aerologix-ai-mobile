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

interface ComponentSettings {
  engine_model: string | null;
  engine_tbo_hours: number;
  engine_hours_since_overhaul: number | null;
  engine_last_overhaul_date: string | null;
  propeller_type: 'fixed' | 'variable';
  propeller_model: string | null;
  propeller_manufacturer_interval_years: number | null;
  propeller_hours_since_inspection: number | null;
  propeller_last_inspection_date: string | null;
  avionics_last_certification_date: string | null;
  avionics_certification_interval_months: number;
  magnetos_model: string | null;
  magnetos_interval_hours: number;
  magnetos_hours_since_inspection: number | null;
  magnetos_last_inspection_date: string | null;
  vacuum_pump_model: string | null;
  vacuum_pump_interval_hours: number;
  vacuum_pump_hours_since_replacement: number | null;
  vacuum_pump_last_replacement_date: string | null;
  airframe_last_annual_date: string | null;
  airframe_hours_since_annual: number | null;
  regulations: {
    propeller_fixed_max_years: number;
    propeller_variable_fallback_years: number;
    avionics_certification_months: number;
    magnetos_default_hours: number;
    vacuum_pump_default_hours: number;
    engine_default_tbo: number;
  };
}

interface ELTData {
  last_test_date: string | null;
  battery_change_date: string | null;
  test_interval_months: number;
  battery_interval_months: number;
}

interface ComponentStatus {
  name: string;
  icon: string;
  percentage: number;
  current: string;
  limit: string;
  color: string;
  status: 'green' | 'yellow' | 'red' | 'grey';
  type: 'hours' | 'date' | 'both';
}

export default function MaintenanceReportScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<ComponentSettings | null>(null);
  const [eltData, setEltData] = useState<ELTData | null>(null);
  const [components, setComponents] = useState<ComponentStatus[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, eltRes] = await Promise.all([
        api.get(`/api/components/aircraft/${aircraftId}`),
        api.get(`/api/elt/aircraft/${aircraftId}`).catch(() => ({ data: null }))
      ]);
      
      setSettings(settingsRes.data);
      setEltData(eltRes.data);
      
      calculateComponents(settingsRes.data, eltRes.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (percentage: number): { color: string; status: 'green' | 'yellow' | 'red' | 'grey' } => {
    if (percentage >= 100) return { color: '#EF4444', status: 'red' };  // Exceeded
    if (percentage >= 80) return { color: '#F59E0B', status: 'yellow' };  // >= 80%
    return { color: '#10B981', status: 'green' };  // < 80%
  };

  const calculateDatePercentage = (lastDate: string | null, intervalMonths: number): number => {
    if (!lastDate) return 0;
    const last = new Date(lastDate);
    const now = new Date();
    const monthsElapsed = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return Math.min((monthsElapsed / intervalMonths) * 100, 150);
  };

  const calculateHoursPercentage = (hoursSince: number | null, interval: number): number => {
    if (!hoursSince) return 0;
    return Math.min((hoursSince / interval) * 100, 150);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Non défini';
    return new Date(dateStr).toLocaleDateString('fr-CA');
  };

  const calculateComponents = (s: ComponentSettings, elt: ELTData | null) => {
    const comps: ComponentStatus[] = [];
    
    // 1. ENGINE
    const enginePct = calculateHoursPercentage(s.engine_hours_since_overhaul, s.engine_tbo_hours);
    const engineStatus = getStatusColor(enginePct);
    comps.push({
      name: 'Moteur',
      icon: 'cog',
      percentage: enginePct,
      current: s.engine_hours_since_overhaul ? `${s.engine_hours_since_overhaul} h` : 'N/D',
      limit: `${s.engine_tbo_hours} h TBO`,
      ...engineStatus,
      type: 'hours'
    });

    // 2. PROPELLER
    let propPct = 0;
    let propLimit = '';
    if (s.propeller_type === 'fixed') {
      // Fixed pitch: 5 years max
      propPct = calculateDatePercentage(s.propeller_last_inspection_date, 5 * 12);
      propLimit = '5 ans';
    } else {
      // Variable: manufacturer interval or 10 years fallback
      const intervalYears = s.propeller_manufacturer_interval_years || 10;
      propPct = calculateDatePercentage(s.propeller_last_inspection_date, intervalYears * 12);
      propLimit = `${intervalYears} ans`;
    }
    const propStatus = getStatusColor(propPct);
    comps.push({
      name: 'Hélice',
      icon: 'sync-circle',
      percentage: propPct,
      current: s.propeller_last_inspection_date ? formatDate(s.propeller_last_inspection_date) : 'N/D',
      limit: propLimit,
      ...propStatus,
      type: s.propeller_type === 'fixed' ? 'date' : 'both'
    });

    // 3. AIRFRAME (Annual)
    const airframePct = calculateDatePercentage(s.airframe_last_annual_date, 12);
    const airframeStatus = getStatusColor(airframePct);
    comps.push({
      name: 'Cellule',
      icon: 'airplane',
      percentage: airframePct,
      current: s.airframe_last_annual_date ? formatDate(s.airframe_last_annual_date) : 'N/D',
      limit: '12 mois',
      ...airframeStatus,
      type: 'date'
    });

    // 4. AVIONICS (24 months)
    const avionicsPct = calculateDatePercentage(s.avionics_last_certification_date, s.avionics_certification_interval_months);
    const avionicsStatus = getStatusColor(avionicsPct);
    comps.push({
      name: 'Avionique (24 mois)',
      icon: 'radio',
      percentage: avionicsPct,
      current: s.avionics_last_certification_date ? formatDate(s.avionics_last_certification_date) : 'N/D',
      limit: '24 mois',
      ...avionicsStatus,
      type: 'date'
    });

    // 5. MAGNETOS (500h default)
    const magnetosPct = calculateHoursPercentage(s.magnetos_hours_since_inspection, s.magnetos_interval_hours);
    const magnetosStatus = getStatusColor(magnetosPct);
    comps.push({
      name: 'Magnétos',
      icon: 'flash',
      percentage: magnetosPct,
      current: s.magnetos_hours_since_inspection ? `${s.magnetos_hours_since_inspection} h` : 'N/D',
      limit: `${s.magnetos_interval_hours} h`,
      ...magnetosStatus,
      type: 'hours'
    });

    // 6. VACUUM PUMP (400h default)
    const vacuumPct = calculateHoursPercentage(s.vacuum_pump_hours_since_replacement, s.vacuum_pump_interval_hours);
    const vacuumStatus = getStatusColor(vacuumPct);
    comps.push({
      name: 'Pompe à vide',
      icon: 'speedometer',
      percentage: vacuumPct,
      current: s.vacuum_pump_hours_since_replacement ? `${s.vacuum_pump_hours_since_replacement} h` : 'N/D',
      limit: `${s.vacuum_pump_interval_hours} h`,
      ...vacuumStatus,
      type: 'hours'
    });

    // 7. ELT (Optional)
    if (elt && (elt.last_test_date || elt.battery_change_date)) {
      const eltTestPct = calculateDatePercentage(elt.last_test_date, elt.test_interval_months || 12);
      const eltBatteryPct = calculateDatePercentage(elt.battery_change_date, elt.battery_interval_months || 72);
      const maxEltPct = Math.max(eltTestPct, eltBatteryPct);
      const eltStatus = getStatusColor(maxEltPct);
      comps.push({
        name: 'ELT',
        icon: 'locate',
        percentage: maxEltPct,
        current: elt.last_test_date ? formatDate(elt.last_test_date) : 'N/D',
        limit: 'Test + Batterie',
        ...eltStatus,
        type: 'date'
      });
    }

    setComponents(comps);
  };

  const renderProgressBar = (comp: ComponentStatus) => {
    const width = Math.min(comp.percentage, 100);
    return (
      <View style={styles.card} key={comp.name}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: comp.color + '20' }]}>
            <Ionicons name={comp.icon as any} size={24} color={comp.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{comp.name}</Text>
            <Text style={styles.cardSubtitle}>{comp.type === 'hours' ? 'Heures' : comp.type === 'date' ? 'Date' : 'Mixte'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: comp.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: comp.color }]} />
            <Text style={[styles.statusText, { color: comp.color }]}>
              {comp.status === 'green' ? 'OK' : comp.status === 'yellow' ? 'Bientôt' : comp.status === 'red' ? 'Dépassé' : '—'}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${width}%`, backgroundColor: comp.color }]} />
            {width >= 80 && width < 100 && <View style={[styles.warningLine, { left: '80%' }]} />}
          </View>
          <Text style={styles.progressText}>{Math.round(comp.percentage)}%</Text>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Actuel</Text>
            <Text style={styles.footerValue}>{comp.current}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Limite</Text>
            <Text style={styles.footerValue}>{comp.limit}</Text>
          </View>
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
          <Text style={styles.headerTitle}>Rapport</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push({
            pathname: '/aircraft/maintenance/settings',
            params: { aircraftId, registration }
          })} 
          style={styles.headerBtn}
        >
          <Ionicons name="settings-outline" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={16} color="#64748B" />
        <Text style={styles.disclaimerText}>
          Informatif uniquement — Consultez un AME certifié
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>&lt; 80%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>≥ 80%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Dépassé</Text>
            </View>
          </View>

          {components.map(renderProgressBar)}
          
          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Réf: Transport Canada RAC 605 / Standard 625
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  disclaimer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF3C7', paddingVertical: 8, gap: 6,
  },
  disclaimerText: { fontSize: 12, color: '#92400E' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  legend: {
    flexDirection: 'row', justifyContent: 'center',
    marginBottom: 16, gap: 20,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#64748B' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  cardSubtitle: { fontSize: 12, color: '#94A3B8' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: {
    flex: 1, height: 10, backgroundColor: '#E2E8F0',
    borderRadius: 5, overflow: 'hidden', position: 'relative',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  warningLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#F59E0B',
  },
  progressText: { fontSize: 14, fontWeight: '600', color: '#1E293B', width: 45 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  footerItem: {},
  footerLabel: { fontSize: 11, color: '#94A3B8' },
  footerValue: { fontSize: 14, fontWeight: '500', color: '#1E293B' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerNote: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
});
