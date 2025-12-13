import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAircraftStore } from '../../stores/aircraftStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AircraftDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { selectedAircraft, deleteAircraft } = useAircraftStore();

  if (!selectedAircraft) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedAircraft.registration}?`);
    if (confirmed) {
      try {
        await deleteAircraft(selectedAircraft._id);
        alert('Aircraft deleted successfully');
        router.back();
      } catch (error: any) {
        console.error('Delete error:', error);
        alert('Failed to delete aircraft: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleEdit = () => {
    router.push(`/aircraft/edit/${selectedAircraft._id}`);
  };

  return (
    <ScrollView style={styles.container}>
      <ImageBackground
        source={
          selectedAircraft.photo_url
            ? { uri: selectedAircraft.photo_url }
            : require('../../assets/images/icon.png')
        }
        style={styles.banner}
        imageStyle={styles.bannerImage}
      >
        <LinearGradient
          colors={['rgba(30, 58, 138, 0.6)', 'rgba(30, 58, 138, 0.9)']}
          style={styles.bannerGradient}
        >
          <Text style={styles.registration}>{selectedAircraft.registration}</Text>
          <Text style={styles.aircraftType}>
            {selectedAircraft.manufacturer} {selectedAircraft.model || selectedAircraft.aircraft_type}
          </Text>
          {selectedAircraft.year && <Text style={styles.year}>{selectedAircraft.year}</Text>}
        </LinearGradient>
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aircraft Hours</Text>
          <View style={styles.hoursGrid}>
            <View style={styles.hoursCard}>
              <Ionicons name="speedometer" size={32} color="#1E3A8A" />
              <Text style={styles.hoursLabel}>Airframe</Text>
              <Text style={styles.hoursValue}>{selectedAircraft.airframe_hours}h</Text>
            </View>
            <View style={styles.hoursCard}>
              <Ionicons name="settings" size={32} color="#1E3A8A" />
              <Text style={styles.hoursLabel}>Engine</Text>
              <Text style={styles.hoursValue}>{selectedAircraft.engine_hours}h</Text>
            </View>
            <View style={styles.hoursCard}>
              <Ionicons name="sync" size={32} color="#1E3A8A" />
              <Text style={styles.hoursLabel}>Propeller</Text>
              <Text style={styles.hoursValue}>{selectedAircraft.propeller_hours}h</Text>
            </View>
          </View>
        </View>

        {selectedAircraft.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.card}>
              <Text style={styles.description}>{selectedAircraft.description}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modules</Text>
          
          <TouchableOpacity style={styles.moduleCard} disabled>
            <View style={styles.moduleIcon}>
              <Ionicons name="camera" size={24} color="#94A3B8" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>OCR History</Text>
              <Text style={styles.moduleSubtitle}>Scanned maintenance reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} disabled>
            <View style={styles.moduleIcon}>
              <Ionicons name="construct" size={24} color="#94A3B8" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>Maintenance</Text>
              <Text style={styles.moduleSubtitle}>Maintenance tracking & history</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} disabled>
            <View style={styles.moduleIcon}>
              <Ionicons name="alert-circle" size={24} color="#94A3B8" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>AD/SB</Text>
              <Text style={styles.moduleSubtitle}>Airworthiness Directives & Service Bulletins</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} disabled>
            <View style={styles.moduleIcon}>
              <Ionicons name="document-text" size={24} color="#94A3B8" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>STC</Text>
              <Text style={styles.moduleSubtitle}>Supplemental Type Certificates</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Delete Aircraft</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  banner: {
    height: 300,
  },
  bannerImage: {
    resizeMode: 'cover',
  },
  bannerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  registration: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  aircraftType: {
    fontSize: 20,
    color: '#E2E8F0',
    marginTop: 8,
  },
  year: {
    fontSize: 16,
    color: '#CBD5E1',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  hoursGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  hoursCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  hoursLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  hoursValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    opacity: 0.6,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
