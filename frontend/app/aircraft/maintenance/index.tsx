import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAINTENANCE_MODULES = [
  {
    id: 'report',
    title: 'Rapport',
    subtitle: 'Dashboard et statistiques maintenance',
    icon: 'bar-chart-outline',
    color: '#3B82F6',
    route: '/aircraft/maintenance/report',
  },
  {
    id: 'parts',
    title: 'Pièces',
    subtitle: 'Inventaire et historique pièces',
    icon: 'hardware-chip-outline',
    color: '#10B981',
    route: '/aircraft/maintenance/parts',
  },
  {
    id: 'invoices',
    title: 'Factures',
    subtitle: 'Factures et coûts maintenance',
    icon: 'receipt-outline',
    color: '#8B5CF6',
    route: '/aircraft/maintenance/invoices',
  },
  {
    id: 'adsb',
    title: 'AD/SB',
    subtitle: 'Directives et bulletins de service',
    icon: 'alert-circle-outline',
    color: '#EF4444',
    route: '/aircraft/maintenance/adsb',
  },
  {
    id: 'stc',
    title: 'STC',
    subtitle: 'Certificats de type supplémentaires',
    icon: 'document-text-outline',
    color: '#F59E0B',
    route: '/aircraft/maintenance/stc',
  },
];

export default function MaintenanceIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Maintenance</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Avion'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {MAINTENANCE_MODULES.map((module) => (
          <TouchableOpacity
            key={module.id}
            style={styles.moduleCard}
            onPress={() =>
              router.push({
                pathname: module.route as any,
                params: { aircraftId, registration },
              })
            }
          >
            <View style={[styles.moduleIcon, { backgroundColor: module.color + '20' }]}>
              <Ionicons name={module.icon as any} size={28} color={module.color} />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>{module.title}</Text>
              <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
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
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moduleContent: {
    flex: 1,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  moduleSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
});
