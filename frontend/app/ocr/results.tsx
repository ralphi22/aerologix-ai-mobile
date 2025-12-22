import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';

interface ExtractedADSB {
  adsb_type: string;
  reference_number: string;
  status: string;
  compliance_date?: string;
  airframe_hours?: number;
  engine_hours?: number;
  propeller_hours?: number;
  description?: string;
}

interface ExtractedPart {
  part_number: string;
  name?: string;
  serial_number?: string;
  quantity: number;
  price?: number;
  supplier?: string;
}

interface ExtractedData {
  date?: string;
  ame_name?: string;
  amo_name?: string;
  work_order_number?: string;
  description?: string;
  airframe_hours?: number;
  engine_hours?: number;
  propeller_hours?: number;
  remarks?: string;
  total_cost?: number;
  ad_sb_references?: ExtractedADSB[];
  parts_replaced?: ExtractedPart[];
  stc_references?: any[];
}

export default function OCRResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scanId: string;
    aircraftId: string;
    registration: string;
    rawText: string;
    extractedData: string;
    documentType: string;
  }>();

  const [isApplying, setIsApplying] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const extractedData: ExtractedData = params.extractedData
    ? JSON.parse(params.extractedData)
    : {};

  const applyResults = async () => {
    const doApply = async () => {
      setIsApplying(true);
      try {
        console.log('Applying OCR results for scan:', params.scanId);
        const response = await api.post(`/api/ocr/apply/${params.scanId}`);
        console.log('Apply response:', response.data);
        
        const applied = response.data.applied || {};
        const successMessage = `Données appliquées :\n• Maintenance: ${applied.maintenance_record ? 'Créé' : 'Non'}\n• AD/SB: ${applied.adsb_records || 0} enregistrements\n• Pièces: ${applied.part_records || 0} enregistrements\n• STC: ${applied.stc_records || 0} enregistrements`;
        
        if (Platform.OS === 'web') {
          window.alert('Succès !\n\n' + successMessage);
        } else {
          Alert.alert('Succès !', successMessage);
        }
        router.back();
      } catch (error: any) {
        console.error('Apply error:', error);
        const message = error.response?.data?.detail || 'Erreur lors de l\'application';
        if (Platform.OS === 'web') {
          window.alert('Erreur: ' + message);
        } else {
          Alert.alert('Erreur', message);
        }
      } finally {
        setIsApplying(false);
      }
    };

    // Sur mobile natif, utiliser Alert.alert avec callback
    // Sur web/preview, exécuter directement (plus fiable)
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Appliquer les résultats',
        'Cela va mettre à jour les heures de l\'avion et créer les enregistrements correspondants. Continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Appliquer', onPress: doApply }
        ]
      );
    } else {
      // Pour web/preview mobile, exécuter directement
      doApply();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLIED':
        return '#10B981';
      case 'PENDING':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLIED':
        return 'Conforme';
      case 'PENDING':
        return 'En attente';
      default:
        return 'Inconnu';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Résultats OCR</Text>
          <Text style={styles.headerSubtitle}>{params.registration}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container}>
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.successText}>Document analysé avec succès</Text>
        </View>

        {/* Hours Section */}
        {(extractedData.airframe_hours || extractedData.engine_hours || extractedData.propeller_hours) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heures détectées</Text>
            <View style={styles.hoursContainer}>
              {extractedData.airframe_hours && (
                <View style={styles.hourCard}>
                  <Ionicons name="airplane" size={24} color="#3B82F6" />
                  <Text style={styles.hourValue}>{extractedData.airframe_hours}</Text>
                  <Text style={styles.hourLabel}>Cellule</Text>
                </View>
              )}
              {extractedData.engine_hours && (
                <View style={styles.hourCard}>
                  <Ionicons name="cog" size={24} color="#8B5CF6" />
                  <Text style={styles.hourValue}>{extractedData.engine_hours}</Text>
                  <Text style={styles.hourLabel}>Moteur</Text>
                </View>
              )}
              {extractedData.propeller_hours && (
                <View style={styles.hourCard}>
                  <Ionicons name="sync" size={24} color="#10B981" />
                  <Text style={styles.hourValue}>{extractedData.propeller_hours}</Text>
                  <Text style={styles.hourLabel}>Hélice</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Maintenance Info */}
        {(extractedData.description || extractedData.work_order_number) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations maintenance</Text>
            <View style={styles.infoCard}>
              {extractedData.date && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>{extractedData.date}</Text>
                </View>
              )}
              {extractedData.work_order_number && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Work Order</Text>
                  <Text style={styles.infoValue}>{extractedData.work_order_number}</Text>
                </View>
              )}
              {extractedData.ame_name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>AME</Text>
                  <Text style={styles.infoValue}>{extractedData.ame_name}</Text>
                </View>
              )}
              {extractedData.amo_name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>AMO</Text>
                  <Text style={styles.infoValue}>{extractedData.amo_name}</Text>
                </View>
              )}
              {extractedData.description && (
                <View style={[styles.infoRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={[styles.infoValue, { marginTop: 4 }]}>{extractedData.description}</Text>
                </View>
              )}
              {extractedData.total_cost && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Coût total</Text>
                  <Text style={styles.infoValue}>${extractedData.total_cost}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* AD/SB Section */}
        {extractedData.ad_sb_references && extractedData.ad_sb_references.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AD/SB Détectés</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{extractedData.ad_sb_references.length}</Text>
              </View>
            </View>
            {extractedData.ad_sb_references.map((item, index) => (
              <View key={index} style={styles.adsbCard}>
                <View style={styles.adsbHeader}>
                  <View style={[styles.adsbTypeBadge, { backgroundColor: item.adsb_type === 'AD' ? '#EF4444' : '#3B82F6' }]}>
                    <Text style={styles.adsbTypeText}>{item.adsb_type}</Text>
                  </View>
                  <Text style={styles.adsbReference}>{item.reference_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>
                {item.description && (
                  <Text style={styles.adsbDescription}>{item.description}</Text>
                )}
                {(item.compliance_date || item.airframe_hours) && (
                  <View style={styles.adsbDetails}>
                    {item.compliance_date && (
                      <Text style={styles.adsbDetail}>Date: {item.compliance_date}</Text>
                    )}
                    {item.airframe_hours && (
                      <Text style={styles.adsbDetail}>Heures: {item.airframe_hours}</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Parts Section */}
        {extractedData.parts_replaced && extractedData.parts_replaced.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pièces Détectées</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{extractedData.parts_replaced.length}</Text>
              </View>
            </View>
            {extractedData.parts_replaced.map((part, index) => (
              <View key={index} style={styles.partCard}>
                <View style={styles.partHeader}>
                  <Ionicons name="hardware-chip" size={20} color="#64748B" />
                  <Text style={styles.partNumber}>{part.part_number}</Text>
                  {part.quantity > 1 && (
                    <Text style={styles.partQuantity}>x{part.quantity}</Text>
                  )}
                </View>
                {part.name && <Text style={styles.partName}>{part.name}</Text>}
                <View style={styles.partDetails}>
                  {part.serial_number && <Text style={styles.partDetail}>S/N: {part.serial_number}</Text>}
                  {part.price && <Text style={styles.partDetail}>${part.price}</Text>}
                  {part.supplier && <Text style={styles.partDetail}>{part.supplier}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Raw Text Toggle */}
        <TouchableOpacity
          style={styles.rawTextToggle}
          onPress={() => setShowRawText(!showRawText)}
        >
          <Ionicons name={showRawText ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
          <Text style={styles.rawTextToggleText}>
            {showRawText ? 'Masquer le texte brut' : 'Voir le texte brut'}
          </Text>
        </TouchableOpacity>

        {showRawText && (
          <View style={styles.rawTextContainer}>
            <Text style={styles.rawText}>{params.rawText || 'Aucun texte extrait'}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.applyButton, isApplying && styles.applyButtonDisabled]}
            onPress={applyResults}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            )}
            <Text style={styles.applyButtonText}>
              {isApplying ? 'Application...' : 'Appliquer au système'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Ionicons name="close-circle" size={24} color="#64748B" />
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>

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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  hoursContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  hourCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  hourValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  hourLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
  },
  adsbCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  adsbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adsbTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  adsbTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  adsbReference: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adsbDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  adsbDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  adsbDetail: {
    fontSize: 12,
    color: '#94A3B8',
  },
  partCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  partHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partNumber: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  partQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  partName: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  partDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  partDetail: {
    fontSize: 12,
    color: '#94A3B8',
  },
  rawTextToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  rawTextToggleText: {
    fontSize: 14,
    color: '#64748B',
  },
  rawTextContainer: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  rawText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
});
