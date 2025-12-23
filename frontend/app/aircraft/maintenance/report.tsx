import React, { useEffect, useState, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import api from '../../../services/api';

interface Aircraft {
  _id: string;
  registration: string;
  engine_hours: number;
  propeller_hours: number;
  airframe_hours: number;
}

interface ComponentSettings {
  engine_model: string | null;
  engine_tbo_hours: number;
  engine_last_overhaul_hours: number | null;
  engine_last_overhaul_date: string | null;
  propeller_type: 'fixed' | 'variable';
  propeller_model: string | null;
  propeller_manufacturer_interval_years: number | null;
  propeller_last_inspection_hours: number | null;
  propeller_last_inspection_date: string | null;
  avionics_last_certification_date: string | null;
  avionics_certification_interval_months: number;
  magnetos_model: string | null;
  magnetos_interval_hours: number;
  magnetos_last_inspection_hours: number | null;
  magnetos_last_inspection_date: string | null;
  vacuum_pump_model: string | null;
  vacuum_pump_interval_hours: number;
  vacuum_pump_last_replacement_hours: number | null;
  vacuum_pump_last_replacement_date: string | null;
  airframe_last_annual_date: string | null;
  airframe_last_annual_hours: number | null;
  // ELT intervals
  elt_test_interval_months?: number;
  elt_battery_interval_months?: number;
}

interface ELTData {
  last_test_date: string | null;
  battery_install_date: string | null;
  battery_expiry_date: string | null;
  battery_interval_months: number | null;
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
  hasData: boolean;
}

// Interface pour les alertes TC-SAFE
interface Alert {
  id: string;
  component: string;
  icon: string;
  message: string;
  severity: 'warning' | 'critical';  // Jaune ou Rouge
  color: string;
}

export default function MaintenanceReportScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [settings, setSettings] = useState<ComponentSettings | null>(null);
  const [eltData, setEltData] = useState<ELTData | null>(null);
  const [components, setComponents] = useState<ComponentStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Recharger les données à chaque focus (retour de settings)
  useFocusEffect(
    useCallback(() => {
      console.log('[REPORT] Screen focused - reloading data');
      fetchData();
    }, [aircraftId])
  );

  const fetchData = async () => {
    console.log('[REPORT] Fetching data for aircraft:', aircraftId);
    try {
      // Récupérer Aircraft (source de vérité pour les heures) + Settings + ELT
      const [aircraftRes, settingsRes, eltRes] = await Promise.all([
        api.get(`/api/aircraft/${aircraftId}`),
        api.get(`/api/components/aircraft/${aircraftId}`),
        api.get(`/api/elt/aircraft/${aircraftId}`).catch(() => ({ data: null }))
      ]);
      
      console.log('[REPORT] Aircraft data:', JSON.stringify(aircraftRes.data));
      console.log('[REPORT] Settings data:', JSON.stringify(settingsRes.data));
      console.log('[REPORT] ELT data:', eltRes.data ? 'found' : 'none');
      
      setAircraft(aircraftRes.data);
      setSettings(settingsRes.data);
      setEltData(eltRes.data);
      
      calculateComponents(aircraftRes.data, settingsRes.data, eltRes.data);
    } catch (error: any) {
      console.error('[REPORT] Error fetching data:', error);
      console.error('[REPORT] Error details:', error.response?.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (percentage: number, hasData: boolean): { color: string; status: 'green' | 'yellow' | 'red' | 'grey' } => {
    if (!hasData) return { color: '#9CA3AF', status: 'grey' };
    if (percentage >= 100) return { color: '#EF4444', status: 'red' };
    if (percentage >= 80) return { color: '#F59E0B', status: 'yellow' };
    return { color: '#10B981', status: 'green' };
  };

  const calculateDatePercentage = (lastDate: string | null, intervalMonths: number): { pct: number; hasData: boolean } => {
    if (!lastDate) return { pct: 0, hasData: false };
    const last = new Date(lastDate);
    const now = new Date();
    const monthsElapsed = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return { pct: Math.min((monthsElapsed / intervalMonths) * 100, 150), hasData: true };
  };

  const calculateHoursPercentage = (currentHours: number, lastWorkHours: number | null | undefined, interval: number): { pct: number; hoursSince: number; hasData: boolean } => {
    console.log('[CALC] calculateHoursPercentage:', { currentHours, lastWorkHours, interval, typeOfLastWork: typeof lastWorkHours });
    
    // Convertir en nombre pour être sûr
    const current = Number(currentHours) || 0;
    const lastWork = lastWorkHours !== null && lastWorkHours !== undefined ? Number(lastWorkHours) : null;
    const int = Number(interval) || 2000;
    
    // Si on a les heures totales du moteur, on calcule le % vers le TBO
    // lastWork = heures moteur QUAND l'overhaul a été fait (ex: 0 pour moteur neuf)
    if (current > 0) {
      // Si lastWork est défini, on calcule les heures DEPUIS l'overhaul
      // Sinon, on utilise les heures totales (cas où moteur jamais révisé ou données manquantes)
      const hoursSince = lastWork !== null && !isNaN(lastWork) ? (current - lastWork) : current;
      const pct = Math.min((hoursSince / int) * 100, 150);
      console.log('[CALC] Result: hasData=true, hoursSince=', hoursSince, 'pct=', pct);
      return { pct, hoursSince, hasData: true };
    }
    console.log('[CALC] Result: hasData=false (current=', current, ')');
    return { pct: 0, hoursSince: 0, hasData: false };
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Non défini';
    return new Date(dateStr).toLocaleDateString('fr-CA');
  };

  const calculateComponents = (ac: Aircraft, s: ComponentSettings, elt: ELTData | null) => {
    console.log('[REPORT] calculateComponents called');
    console.log('[REPORT] Aircraft engine_hours:', ac.engine_hours);
    console.log('[REPORT] Settings engine_last_overhaul_hours:', s.engine_last_overhaul_hours);
    console.log('[REPORT] Settings engine_tbo_hours:', s.engine_tbo_hours);
    
    const comps: ComponentStatus[] = [];
    
    // 1. MOTEUR - Calcul simple: heures actuelles / TBO
    // La date de révision est juste une info, pas utilisée dans le calcul
    const enginePct = Math.min((ac.engine_hours / s.engine_tbo_hours) * 100, 150);
    const engineStatus = getStatusColor(enginePct, ac.engine_hours > 0);
    console.log('[CALC] Engine: hours=', ac.engine_hours, 'TBO=', s.engine_tbo_hours, 'pct=', enginePct);
    comps.push({
      name: 'Moteur',
      icon: 'cog',
      percentage: enginePct,
      current: `${ac.engine_hours.toFixed(1)} h`,
      limit: `TBO: ${s.engine_tbo_hours} h`,
      ...engineStatus,
      type: 'hours',
      hasData: ac.engine_hours > 0
    });

    // 2. HÉLICE - Source: Aircraft.propeller_hours ou date selon type
    let propCalc: { pct: number; hasData: boolean };
    let propCurrent: string;
    let propLimit: string;
    
    if (s.propeller_type === 'fixed') {
      // Hélice fixe: basé sur DATE (5 ans max)
      propCalc = calculateDatePercentage(s.propeller_last_inspection_date, 5 * 12);
      propCurrent = propCalc.hasData ? `Dernière: ${formatDate(s.propeller_last_inspection_date)}` : 'Données non disponibles';
      propLimit = '5 ans max';
    } else {
      // Hélice variable: basé sur DATE (fabricant ou 10 ans)
      const intervalYears = s.propeller_manufacturer_interval_years || 10;
      propCalc = calculateDatePercentage(s.propeller_last_inspection_date, intervalYears * 12);
      propCurrent = propCalc.hasData ? `Dernière: ${formatDate(s.propeller_last_inspection_date)}` : 'Données non disponibles';
      propLimit = `${intervalYears} ans`;
    }
    const propStatus = getStatusColor(propCalc.pct, propCalc.hasData);
    comps.push({
      name: 'Hélice',
      icon: 'sync-circle',
      percentage: propCalc.pct,
      current: propCurrent,
      limit: propLimit,
      ...propStatus,
      type: 'date',
      hasData: propCalc.hasData
    });

    // 3. CELLULE - Source: date de la dernière annuelle (12 mois)
    const airframeCalc = calculateDatePercentage(s.airframe_last_annual_date, 12);
    const airframeStatus = getStatusColor(airframeCalc.pct, airframeCalc.hasData);
    comps.push({
      name: 'Cellule (Annuelle)',
      icon: 'airplane',
      percentage: airframeCalc.pct,
      current: airframeCalc.hasData ? `Dernière: ${formatDate(s.airframe_last_annual_date)}` : 'Données non disponibles',
      limit: '12 mois',
      ...airframeStatus,
      type: 'date',
      hasData: airframeCalc.hasData
    });

    // 4. AVIONIQUE 24 MOIS - Source: date certification
    const avionicsCalc = calculateDatePercentage(s.avionics_last_certification_date, s.avionics_certification_interval_months);
    const avionicsStatus = getStatusColor(avionicsCalc.pct, avionicsCalc.hasData);
    comps.push({
      name: 'Avionique (24 mois)',
      icon: 'radio',
      percentage: avionicsCalc.pct,
      current: avionicsCalc.hasData ? `Certifié: ${formatDate(s.avionics_last_certification_date)}` : 'Données non disponibles',
      limit: '24 mois',
      ...avionicsStatus,
      type: 'date',
      hasData: avionicsCalc.hasData
    });

    // 5. MAGNÉTOS - Source: Aircraft.engine_hours - Settings.magnetos_last_inspection_hours
    const magnetosCalc = calculateHoursPercentage(ac.engine_hours, s.magnetos_last_inspection_hours, s.magnetos_interval_hours);
    const magnetosStatus = getStatusColor(magnetosCalc.pct, magnetosCalc.hasData);
    comps.push({
      name: 'Magnétos',
      icon: 'flash',
      percentage: magnetosCalc.pct,
      current: magnetosCalc.hasData ? `${magnetosCalc.hoursSince.toFixed(1)} h depuis inspection` : 'Données non disponibles',
      limit: `${s.magnetos_interval_hours} h`,
      ...magnetosStatus,
      type: 'hours',
      hasData: magnetosCalc.hasData
    });

    // 6. POMPE À VIDE - Source: Aircraft.engine_hours - Settings.vacuum_pump_last_replacement_hours
    const vacuumCalc = calculateHoursPercentage(ac.engine_hours, s.vacuum_pump_last_replacement_hours, s.vacuum_pump_interval_hours);
    const vacuumStatus = getStatusColor(vacuumCalc.pct, vacuumCalc.hasData);
    comps.push({
      name: 'Pompe à vide',
      icon: 'speedometer',
      percentage: vacuumCalc.pct,
      current: vacuumCalc.hasData ? `${vacuumCalc.hoursSince.toFixed(1)} h depuis remplacement` : 'Données non disponibles',
      limit: `${s.vacuum_pump_interval_hours} h`,
      ...vacuumStatus,
      type: 'hours',
      hasData: vacuumCalc.hasData
    });

    // 7. ELT (optionnel) - Source: ELT record + intervalles configurables
    if (elt) {
      // Intervalles configurables (défauts: test 12 mois, batterie 24 mois)
      const testInterval = s.elt_test_interval_months || 12;
      const batteryInterval = s.elt_battery_interval_months || elt.battery_interval_months || 24;
      
      // Test - calculé depuis last_test_date
      const eltTestCalc = calculateDatePercentage(elt.last_test_date, testInterval);
      
      // Batterie - utilise battery_expiry_date si disponible, sinon calcule depuis battery_install_date
      let eltBatteryCalc: { pct: number; hasData: boolean } = { pct: 0, hasData: false };
      let batteryDisplayDate: string | null = null;
      
      if (elt.battery_expiry_date) {
        // Calcul direct depuis la date d'expiration
        const expiryDate = new Date(elt.battery_expiry_date);
        const now = new Date();
        const monthsUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        // Pourcentage basé sur le temps restant vs intervalle configuré
        const pct = Math.max(0, Math.min(((batteryInterval - monthsUntilExpiry) / batteryInterval) * 100, 150));
        eltBatteryCalc = { pct, hasData: true };
        batteryDisplayDate = elt.battery_expiry_date;
      } else if (elt.battery_install_date) {
        // Calcul depuis la date d'installation avec intervalle configurable
        eltBatteryCalc = calculateDatePercentage(elt.battery_install_date, batteryInterval);
        batteryDisplayDate = elt.battery_install_date;
      }
      
      const hasEltData = eltTestCalc.hasData || eltBatteryCalc.hasData;
      const maxEltPct = Math.max(eltTestCalc.pct, eltBatteryCalc.pct);
      const eltStatus = getStatusColor(maxEltPct, hasEltData);
      
      let eltCurrent = 'Données non disponibles';
      if (eltTestCalc.hasData && eltBatteryCalc.hasData) {
        const battLabel = elt.battery_expiry_date ? 'Exp. batt' : 'Batt';
        eltCurrent = `Test: ${formatDate(elt.last_test_date)} | ${battLabel}: ${formatDate(batteryDisplayDate)}`;
      } else if (eltTestCalc.hasData) {
        eltCurrent = `Dernier test: ${formatDate(elt.last_test_date)}`;
      } else if (eltBatteryCalc.hasData) {
        const battLabel = elt.battery_expiry_date ? 'Expiration batterie' : 'Installation batterie';
        eltCurrent = `${battLabel}: ${formatDate(batteryDisplayDate)}`;
      }
      
      comps.push({
        name: 'ELT',
        icon: 'locate',
        percentage: maxEltPct,
        current: eltCurrent,
        limit: `Test ${testInterval}m / Batt ${batteryInterval}m`,
        ...eltStatus,
        type: 'date',
        hasData: hasEltData
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
            <Text style={styles.cardSubtitle}>{comp.type === 'hours' ? 'Heures' : 'Date'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: comp.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: comp.color }]} />
            <Text style={[styles.statusText, { color: comp.color }]}>
              {!comp.hasData ? 'N/D' : comp.status === 'green' ? 'OK' : comp.status === 'yellow' ? 'Bientôt' : 'Dépassé'}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {comp.hasData && (
              <View style={[styles.progressFill, { width: `${width}%`, backgroundColor: comp.color }]} />
            )}
            {comp.hasData && width >= 80 && width < 100 && <View style={[styles.warningLine, { left: '80%' }]} />}
          </View>
          <Text style={styles.progressText}>{comp.hasData ? `${Math.round(comp.percentage)}%` : '—'}</Text>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>État</Text>
            <Text style={[styles.footerValue, !comp.hasData && styles.footerValueGrey]} numberOfLines={1}>
              {comp.current}
            </Text>
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
          {aircraft && (
            <View style={styles.hoursBar}>
              <View style={styles.hoursItem}>
                <Text style={styles.hoursValue}>{aircraft.engine_hours?.toFixed(1) || '0'}</Text>
                <Text style={styles.hoursLabel}>Heures moteur</Text>
              </View>
              <View style={styles.hoursDivider} />
              <View style={styles.hoursItem}>
                <Text style={styles.hoursValue}>{aircraft.propeller_hours?.toFixed(1) || '0'}</Text>
                <Text style={styles.hoursLabel}>Heures hélice</Text>
              </View>
              <View style={styles.hoursDivider} />
              <View style={styles.hoursItem}>
                <Text style={styles.hoursValue}>{aircraft.airframe_hours?.toFixed(1) || '0'}</Text>
                <Text style={styles.hoursLabel}>Heures cellule</Text>
              </View>
            </View>
          )}

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
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
              <Text style={styles.legendText}>N/D</Text>
            </View>
          </View>

          {components.map(renderProgressBar)}
          
          <View style={styles.footerSection}>
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
  hoursBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  hoursItem: { flex: 1, alignItems: 'center' },
  hoursValue: { fontSize: 20, fontWeight: 'bold', color: '#1E3A8A' },
  hoursLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  hoursDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  legend: {
    flexDirection: 'row', justifyContent: 'center',
    marginBottom: 16, gap: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#64748B' },
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
  progressText: { fontSize: 14, fontWeight: '600', color: '#1E293B', width: 40, textAlign: 'right' },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  footerItem: { flex: 1 },
  footerLabel: { fontSize: 11, color: '#94A3B8' },
  footerValue: { fontSize: 13, fontWeight: '500', color: '#1E293B', marginTop: 2 },
  footerValueGrey: { color: '#9CA3AF', fontStyle: 'italic' },
  footerSection: { alignItems: 'center', paddingVertical: 20 },
  footerNote: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
});
