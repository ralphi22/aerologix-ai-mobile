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

// Types de documents avec mapping vers le backend
type DocumentType = 'maintenance_report' | 'invoice' | 'other';

const DOCUMENT_TYPES = [
  {
    id: 'maintenance_report' as DocumentType,
    title: 'Rapport',
    description: 'Rapport de maintenance / Journey log',
    icon: 'document-text-outline',
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

  // Par défaut: rapport de maintenance (scan complet)
  const [selectedType, setSelectedType] = useState<DocumentType>('maintenance_report');
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
      console.log('Sending OCR request with document_type:', selectedType);
      
      const response = await api.post('/api/ocr/scan', {
        aircraft_id: aircraftId,
        document_type: selectedType, // Maintenant envoie le bon format
        image_base64: imageBase64,
      });

      console.log('OCR response received:', response.data?.id);

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
          <Text style={styles.sectionTitle}>Image du document</Text>
          
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
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
            <View style={styles.imageSelectionContainer}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => pickImage(true)}
              >
                <Ionicons name="camera" size={32} color="#3B82F6" />
                <Text style={styles.imageButtonText}>Prendre une photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="images" size={32} color="#8B5CF6" />
                <Text style={styles.imageButtonText}>Galerie</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info box pour le type sélectionné */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            {selectedType === 'maintenance_report' 
              ? 'Scan complet: heures, maintenance, pièces, AD/SB, ELT'
              : selectedType === 'invoice'
              ? 'Extraction des pièces et coûts de la facture'
              : 'Extraction générale du document'}
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
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: 11,
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
  imageSelectionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  imageButtonText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
