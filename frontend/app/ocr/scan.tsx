import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

type DocumentType = 'logbook' | 'invoice' | 'work_order' | 'ad_compliance' | 'sb_compliance' | 'stc' | 'other';

const DOCUMENT_TYPES = [
  {
    id: 'logbook' as DocumentType,
    title: 'Logbook',
    description: 'Carnet de vol / Journey log',
    icon: 'book-outline',
    color: '#3B82F6',
  },
  {
    id: 'invoice' as DocumentType,
    title: 'Facture',
    description: 'Factures, bons de commande',
    icon: 'receipt-outline',
    color: '#10B981',
  },
  {
    id: 'work_order' as DocumentType,
    title: 'Work Order',
    description: 'Maintenance release',
    icon: 'construct-outline',
    color: '#8B5CF6',
  },
  {
    id: 'ad_compliance' as DocumentType,
    title: 'AD Compliance',
    description: 'Airworthiness Directive',
    icon: 'alert-circle-outline',
    color: '#EF4444',
  },
  {
    id: 'sb_compliance' as DocumentType,
    title: 'SB Compliance',
    description: 'Service Bulletin',
    icon: 'warning-outline',
    color: '#F59E0B',
  },
  {
    id: 'stc' as DocumentType,
    title: 'STC',
    description: 'Supplemental Type Certificate',
    icon: 'document-text-outline',
    color: '#6366F1',
  },
  {
    id: 'other' as DocumentType,
    title: 'Autre',
    description: 'Document divers',
    icon: 'folder-outline',
    color: '#64748B',
  },
];

export default function OCRScanScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [selectedType, setSelectedType] = useState<DocumentType>('other');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'Accès à la caméra nécessaire pour scanner les documents.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'Accès à la galerie nécessaire pour sélectionner les documents.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (useCamera) {
        const cameraResult = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
          base64: true,
        });
        if (!cameraResult.canceled && cameraResult.assets[0]) {
          setImageUri(cameraResult.assets[0].uri);
          setImageBase64(cameraResult.assets[0].base64 || null);
        }
      } else {
        if (!result.canceled && result.assets[0]) {
          setImageUri(result.assets[0].uri);
          setImageBase64(result.assets[0].base64 || null);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const analyzeDocument = async () => {
    if (!imageBase64 || !aircraftId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await api.post('/api/ocr/scan', {
        aircraft_id: aircraftId,
        document_type: selectedType,
        image_base64: imageBase64,
      });

      // Navigate to results screen
      router.push({
        pathname: '/ocr/results',
        params: {
          scanId: response.data.id,
          aircraftId,
          registration,
          rawText: response.data.raw_text || '',
          extractedData: JSON.stringify(response.data.extracted_data || {}),
          documentType: selectedType,
        },
      });
    } catch (error: any) {
      console.error('OCR Error:', error);
      const message = error.response?.data?.detail || 'Erreur lors de l\'analyse du document';
      Alert.alert('Erreur OCR', message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Scanner un document</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Avion'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container}>
        {/* Document Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de document</Text>
          <View style={styles.typeContainer}>
            {DOCUMENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && { borderColor: type.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                  <Ionicons name={type.icon as any} size={24} color={type.color} />
                </View>
                <Text style={styles.typeTitle}>{type.title}</Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
                {selectedType === type.id && (
                  <View style={[styles.selectedBadge, { backgroundColor: type.color }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Image Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Document à analyser</Text>
          
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setImageUri(null);
                  setImageBase64(null);
                }}
              >
                <Ionicons name="close-circle" size={32} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage(true)}>
                <Ionicons name="camera" size={32} color="#1E3A8A" />
                <Text style={styles.imagePickerText}>Prendre une photo</Text>
              </TouchableOpacity>
              
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage(false)}>
                <Ionicons name="images" size={32} color="#1E3A8A" />
                <Text style={styles.imagePickerText}>Galerie photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            L'IA analysera le document et extraira automatiquement les informations :
            heures, AD/SB, pièces remplacées, etc.
          </Text>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            (!imageBase64 || isAnalyzing) && styles.analyzeButtonDisabled,
          ]}
          onPress={analyzeDocument}
          disabled={!imageBase64 || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.analyzeButtonText}>Analyse en cours...</Text>
            </>
          ) : (
            <>
              <Ionicons name="scan" size={24} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>Analyser le document</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  imagePickerButton: {
    alignItems: 'center',
    padding: 16,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748B',
    fontSize: 14,
  },
  imagePreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
