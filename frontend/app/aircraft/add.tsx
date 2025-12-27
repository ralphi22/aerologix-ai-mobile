import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAircraftStore } from '../../stores/aircraftStore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function AddAircraftScreen() {
  const router = useRouter();
  const { addAircraft } = useAircraftStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    registration: '',
    aircraft_type: '',
    manufacturer: '',
    model: '',
    year: '',
    airframe_hours: '',
    engine_hours: '',
    propeller_hours: '',
    description: '',
    photo_url: '',
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, photo_url: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSubmit = async () => {
    if (!formData.registration) {
      Alert.alert('Error', 'Registration is required');
      return;
    }

    setLoading(true);
    try {
      const aircraftData = {
        registration: formData.registration.toUpperCase(),
        aircraft_type: formData.aircraft_type || undefined,
        manufacturer: formData.manufacturer || undefined,
        model: formData.model || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        airframe_hours: parseFloat(formData.airframe_hours) || 0,
        engine_hours: parseFloat(formData.engine_hours) || 0,
        propeller_hours: parseFloat(formData.propeller_hours) || 0,
        description: formData.description || undefined,
        photo_url: formData.photo_url || undefined,
      };

      await addAircraft(aircraftData);
      Alert.alert('Success', 'Aircraft added successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add aircraft');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          {formData.photo_url ? (
            <Image source={{ uri: formData.photo_url }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#94A3B8" />
              <Text style={styles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Information</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registration *</Text>
            <TextInput
              style={styles.input}
              placeholder="C-GABC"
              value={formData.registration}
              onChangeText={(text) => setFormData({ ...formData, registration: text.toUpperCase() })}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aircraft Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Aircraft Type</Text>
            <TextInput
              style={styles.input}
              placeholder="Cessna 172"
              value={formData.aircraft_type}
              onChangeText={(text) => setFormData({ ...formData, aircraft_type: text })}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Manufacturer</Text>
              <TextInput
                style={styles.input}
                placeholder="Cessna"
                value={formData.manufacturer}
                onChangeText={(text) => setFormData({ ...formData, manufacturer: text })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                placeholder="172S"
                value={formData.model}
                onChangeText={(text) => setFormData({ ...formData, model: text })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Year</Text>
            <TextInput
              style={styles.input}
              placeholder="2005"
              value={formData.year}
              onChangeText={(text) => setFormData({ ...formData, year: text })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hours</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Airframe Hours</Text>
            <TextInput
              style={styles.input}
              placeholder="0.0"
              value={formData.airframe_hours}
              onChangeText={(text) => setFormData({ ...formData, airframe_hours: text })}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Engine Hours</Text>
            <TextInput
              style={styles.input}
              placeholder="0.0"
              value={formData.engine_hours}
              onChangeText={(text) => setFormData({ ...formData, engine_hours: text })}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Propeller Hours</Text>
            <TextInput
              style={styles.input}
              placeholder="0.0"
              value={formData.propeller_hours}
              onChangeText={(text) => setFormData({ ...formData, propeller_hours: text })}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes about this aircraft..."
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Add Aircraft</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  photoButton: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
