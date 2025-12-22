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
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAircraftStore } from '../../stores/aircraftStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AircraftDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { selectedAircraft, deleteAircraft } = useAircraftStore();
  const insets = useSafeAreaInsets();

  if (!selectedAircraft) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  const handleDelete = async () => {
    const confirmDelete = () => {
      deleteAircraft(selectedAircraft._id)
        .then(() => {
          if (Platform.OS === 'web') {
            window.alert('Aircraft deleted successfully');
          } else {
            Alert.alert('Success', 'Aircraft deleted successfully');
          }
          router.replace('/(tabs)');
        })
        .catch((error: any) => {
          console.error('Delete error:', error);
          const msg = 'Failed to delete aircraft: ' + (error.response?.data?.detail || error.message);
          if (Platform.OS === 'web') {
            window.alert(msg);
          } else {
            Alert.alert('Error', msg);
          }
        });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete ${selectedAircraft.registration}?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete ${selectedAircraft.registration}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  const handleEdit = () => {
    router.push(`/aircraft/edit/${selectedAircraft._id}`);
  };

  const handleGoBack = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedAircraft.registration}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
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
          <Text style={styles.sectionTitle}>Heures de vol</Text>
          <View style={styles.hoursGrid}>
            <View style={styles.hoursCard}>
              <Ionicons name="speedometer" size={32} color="#1E3A8A" />
              <Text style={styles.hoursLabel}>Cellule</Text>
              <Text style={styles.hoursValue}>{selectedAircraft.airframe_hours}h</Text>
            </View>
            <View style={styles.hoursCard}>
              <Ionicons name="settings" size={32} color="#1E3A8A" />
              <Text style={styles.hoursLabel}>Moteur</Text>
              <Text style={styles.hoursValue}>{selectedAircraft.engine_hours}h</Text>
            </View>
            <View style={styles.hoursCard}>
              <Ionicons name="sync" size={32} color="#1E3A8A" />
              <Text style={styles.hoursLabel}>Hélice</Text>
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
          
          <TouchableOpacity 
            style={[styles.moduleCard, styles.moduleCardActive]}
            onPress={() => router.push({
              pathname: '/aircraft/logbook',
              params: { aircraftId: selectedAircraft._id, registration: selectedAircraft.registration }
            })}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="book" size={24} color="#3B82F6" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>Log Book</Text>
              <Text style={styles.moduleSubtitle}>Historique des vols et entrées</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.moduleCard, styles.moduleCardActive]}
            onPress={() => router.push({
              pathname: '/aircraft/maintenance',
              params: { aircraftId: selectedAircraft._id, registration: selectedAircraft.registration }
            })}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="construct" size={24} color="#F59E0B" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>Maintenance</Text>
              <Text style={styles.moduleSubtitle}>Rapport, Pièces, AD/SB, STC</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.moduleCard, styles.moduleCardActive]}
            onPress={() => router.push({
              pathname: '/aircraft/elt',
              params: { aircraftId: selectedAircraft._id, registration: selectedAircraft.registration }
            })}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="radio" size={24} color="#EF4444" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>ELT</Text>
              <Text style={styles.moduleSubtitle}>Emergency Locator Transmitter</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.moduleCard, styles.moduleCardActive]}
            onPress={() => router.push({
              pathname: '/aircraft/wb',
              params: { aircraftId: selectedAircraft._id, registration: selectedAircraft.registration }
            })}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="scale" size={24} color="#6366F1" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>W/B</Text>
              <Text style={styles.moduleSubtitle}>Weight & Balance</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outils</Text>
          
          <TouchableOpacity 
            style={[styles.moduleCard, styles.moduleCardActive]}
            onPress={() => router.push({
              pathname: '/ocr/scan',
              params: { aircraftId: selectedAircraft._id, registration: selectedAircraft.registration }
            })}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="scan" size={24} color="#10B981" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>Scanner OCR</Text>
              <Text style={styles.moduleSubtitle}>Analyser un document</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#10B981" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.moduleCard, styles.moduleCardActive]}
            onPress={() => router.push({
              pathname: '/ocr/history',
              params: { aircraftId: selectedAircraft._id, registration: selectedAircraft.registration }
            })}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="time" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleName}>Historique OCR</Text>
              <Text style={styles.moduleSubtitle}>Documents scannés</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Modifier l'avion</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Supprimer l'avion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
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
  moduleCardActive: {
    opacity: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 16,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
