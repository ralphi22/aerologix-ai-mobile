import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'BASIC':
        return '#94A3B8';
      case 'PILOT':
        return '#3B82F6';
      case 'MAINTENANCE_PRO':
        return '#8B5CF6';
      case 'FLEET_AI':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={100} color="#1E3A8A" />
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View
          style={[
            styles.planCard,
            { backgroundColor: getPlanColor(user.subscription.plan) },
          ]}
        >
          <Text style={styles.planName}>{user.subscription.plan}</Text>
          <Text style={styles.planStatus}>{user.subscription.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Limits</Text>
        <View style={styles.limitCard}>
          <View style={styles.limitRow}>
            <Ionicons name="airplane-outline" size={20} color="#64748B" />
            <Text style={styles.limitLabel}>Aircraft</Text>
            <Text style={styles.limitValue}>
              {user.limits.max_aircrafts === -1 ? 'Unlimited' : user.limits.max_aircrafts}
            </Text>
          </View>
          <View style={styles.limitRow}>
            <Ionicons name="camera-outline" size={20} color="#64748B" />
            <Text style={styles.limitLabel}>OCR per month</Text>
            <Text style={styles.limitValue}>
              {user.limits.ocr_per_month === -1 ? 'Unlimited' : user.limits.ocr_per_month}
            </Text>
          </View>
          <View style={styles.limitRow}>
            <Ionicons name="book-outline" size={20} color="#64748B" />
            <Text style={styles.limitLabel}>Logbook entries/month</Text>
            <Text style={styles.limitValue}>
              {user.limits.logbook_entries_per_month === -1
                ? 'Unlimited'
                : user.limits.logbook_entries_per_month}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  email: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  planCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  planStatus: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  limitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  limitLabel: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    marginLeft: 12,
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
