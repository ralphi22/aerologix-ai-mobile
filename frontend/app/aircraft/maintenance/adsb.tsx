import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function MaintenanceADSBScreen() {
  const router = useRouter();
  const { registration } = useLocalSearchParams<{ registration: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AD/SB</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.placeholder}>
        <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
        <Text style={styles.placeholderTitle}>Airworthiness Directives</Text>
        <Text style={styles.placeholderSubtitle}>Service Bulletins</Text>
        <Text style={styles.placeholderText}>Bientôt disponible</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  placeholderTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B', marginTop: 16 },
  placeholderSubtitle: { fontSize: 16, color: '#64748B', marginTop: 4 },
  placeholderText: { fontSize: 14, color: '#94A3B8', marginTop: 12 },
});
