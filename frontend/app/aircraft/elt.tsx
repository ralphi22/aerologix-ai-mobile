import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';

// URL du registre canadien des balises
const CANADIAN_BEACON_REGISTRY_URL = 'https://www.canada.ca/fr/force-aerienne/services/recherche-sauvetage/registre-balise.html';

interface ELTAlert {
  type: string;
  level: 'ok' | 'warning' | 'critical';
  message: string;
  due_date?: string;
  days_remaining?: number;
}

interface ELTData {
  id?: string;
  _id?: string;  // Backend returns _id
  aircraft_id: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string;
  certification_date?: string;
  last_test_date?: string;
  battery_expiry_date?: string;
  battery_install_date?: string;
  battery_interval_months?: number;
  beacon_hex_id?: string;
  registration_number?: string;
  remarks?: string;
  source?: string;
  status?: string;
  alerts?: ELTAlert[];
}

export default function ELTScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eltData, setEltData] = useState<ELTData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ELTData>>({});

  useEffect(() => {
    fetchELTData();
  }, [aircraftId]);

  const fetchELTData = async () => {
    try {
      const response = await api.get(`/api/elt/aircraft/${aircraftId}`);
      if (response.data) {
        setEltData(response.data);
        setFormData(response.data);
      }
    } catch (error: any) {
      // 404 is expected if no ELT exists yet
      if (error.response?.status !== 404) {
        console.error('Error fetching ELT:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Préparer les données en filtrant les champs vides
      const cleanedData: Record<string, any> = {};
      
      // Champs texte
      if (formData.brand) cleanedData.brand = formData.brand;
      if (formData.model) cleanedData.model = formData.model;
      if (formData.serial_number) cleanedData.serial_number = formData.serial_number;
      if (formData.beacon_hex_id) cleanedData.beacon_hex_id = formData.beacon_hex_id;
      if (formData.registration_number) cleanedData.registration_number = formData.registration_number;
      if (formData.remarks) cleanedData.remarks = formData.remarks;
      
      // Champs dates - formater correctement
      const dateFields = ['installation_date', 'certification_date', 'last_test_date', 
                         'battery_expiry_date', 'battery_install_date'];
      dateFields.forEach(field => {
        const value = formData[field as keyof typeof formData];
        if (value && typeof value === 'string') {
          // Extraire juste la date YYYY-MM-DD
          const dateStr = value.split('T')[0];
          if (dateStr && dateStr !== '') {
            cleanedData[field] = dateStr;
          }
        }
      });
      
      // Champs numériques
      if (formData.battery_interval_months) {
        cleanedData.battery_interval_months = Number(formData.battery_interval_months);
      }
      
      console.log('Saving ELT data:', cleanedData);
      
      // Check if ELT exists (backend returns _id)
      const hasExistingELT = eltData?._id || eltData?.id;
      
      if (hasExistingELT) {
        // Update existing
        console.log('Updating existing ELT for aircraft:', aircraftId);
        const response = await api.put(`/api/elt/aircraft/${aircraftId}`, cleanedData);
        console.log('Update response:', response.data);
      } else {
        // Create new
        const payload = {
          aircraft_id: aircraftId,
          ...cleanedData,
          source: 'manual'
        };
        console.log('Creating ELT with payload:', payload);
        const response = await api.post('/api/elt/', payload);
        console.log('Create response:', response.data);
      }
      
      await fetchELTData();
      setIsEditing(false);
      
      if (Platform.OS === 'web') {
        window.alert('ELT enregistré avec succès');
      } else {
        Alert.alert('Succès', 'ELT enregistré avec succès');
      }
    } catch (error: any) {
      console.error('Save ELT error:', error);
      console.error('Error response:', error.response?.data);
      
      let message = 'Erreur lors de l\'enregistrement';
      if (error.response?.status === 422) {
        message = 'Données invalides. Vérifiez le format des dates (YYYY-MM-DD).';
      } else if (error.response?.status === 400) {
        message = error.response?.data?.detail || 'Erreur: données incorrectes';
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        message = 'Non autorisé. Veuillez vous reconnecter.';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      }
      
      // Ne pas fermer l'écran si erreur
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + message);
      } else {
        Alert.alert('Erreur', message);
      }
    } finally {
      setSaving(false);
    }
  };

  const openBeaconRegistry = async () => {
    try {
      const canOpen = await Linking.canOpenURL(CANADIAN_BEACON_REGISTRY_URL);
      if (canOpen) {
        await Linking.openURL(CANADIAN_BEACON_REGISTRY_URL);
      } else {
        if (Platform.OS === 'web') {
          window.open(CANADIAN_BEACON_REGISTRY_URL, '_blank');
        } else {
          Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
        }
      }
    } catch (error) {
      console.error('Open URL error:', error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      default:
        return 'checkmark-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>ELT</Text>
            <Text style={styles.headerSubtitle}>{registration}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>ELT</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        {!isEditing ? (
          <TouchableOpacity 
            style={styles.editHeaderButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={24} color="#1E3A8A" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView style={styles.container}>
        {/* Icon and Title */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="radio" size={48} color="#EF4444" />
          </View>
          <Text style={styles.title}>Emergency Locator Transmitter</Text>
        </View>

        {/* Alerts Section */}
        {eltData?.alerts && eltData.alerts.length > 0 && (
          <View style={styles.alertsSection}>
            {eltData.alerts.map((alert, index) => (
              <View 
                key={index} 
                style={[
                  styles.alertCard, 
                  { borderLeftColor: getAlertColor(alert.level) }
                ]}
              >
                <Ionicons 
                  name={getAlertIcon(alert.level) as any} 
                  size={24} 
                  color={getAlertColor(alert.level)} 
                />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertMessage, { color: getAlertColor(alert.level) }]}>
                    {alert.message}
                  </Text>
                  {alert.due_date && (
                    <Text style={styles.alertDate}>
                      Échéance: {formatDate(alert.due_date)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ELT Info or Form */}
        {isEditing ? (
          // Edit Form
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Informations ELT</Text>
            
            <View style={styles.formCard}>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Marque</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.brand || ''}
                  onChangeText={(text) => setFormData({...formData, brand: text})}
                  placeholder="Ex: Artex, Kannad, ACK..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Modèle</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.model || ''}
                  onChangeText={(text) => setFormData({...formData, model: text})}
                  placeholder="Modèle de l'ELT"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Numéro de série</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.serial_number || ''}
                  onChangeText={(text) => setFormData({...formData, serial_number: text})}
                  placeholder="S/N"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>ID Balise (Hex)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.beacon_hex_id || ''}
                  onChangeText={(text) => setFormData({...formData, beacon_hex_id: text})}
                  placeholder="15 caractères hexadécimaux"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Dates importantes</Text>
            
            <View style={styles.formCard}>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Date d'installation</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.installation_date?.split('T')[0] || ''}
                  onChangeText={(text) => setFormData({...formData, installation_date: text})}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Dernier test</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.last_test_date?.split('T')[0] || ''}
                  onChangeText={(text) => setFormData({...formData, last_test_date: text})}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Expiration batterie</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.battery_expiry_date?.split('T')[0] || ''}
                  onChangeText={(text) => setFormData({...formData, battery_expiry_date: text})}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Form Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.saveButtonText}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelFormButton}
                onPress={() => {
                  setFormData(eltData || {});
                  setIsEditing(false);
                }}
              >
                <Text style={styles.cancelFormButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : eltData ? (
          // Display Mode
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informations ELT</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ELT</Text>
                <Text style={styles.infoValue}>
                  {[eltData.brand, eltData.model].filter(Boolean).join(' ') || '-'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Numéro de série</Text>
                <Text style={styles.infoValue}>{eltData.serial_number || '-'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ID Balise</Text>
                <Text style={styles.infoValue}>{eltData.beacon_hex_id || '-'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Installation</Text>
                <Text style={styles.infoValue}>{formatDate(eltData.installation_date)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dernier test</Text>
                <Text style={styles.infoValue}>{formatDate(eltData.last_test_date)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expiration batterie</Text>
                <Text style={[
                  styles.infoValue,
                  eltData.status === 'expired' && { color: '#EF4444' }
                ]}>
                  {formatDate(eltData.battery_expiry_date)}
                </Text>
              </View>
              
              {eltData.source && (
                <View style={styles.sourceRow}>
                  <Ionicons 
                    name={eltData.source === 'ocr' ? 'scan' : 'create'} 
                    size={14} 
                    color="#64748B" 
                  />
                  <Text style={styles.sourceText}>
                    Source: {eltData.source === 'ocr' ? 'OCR (rapport de maintenance)' : 'Saisie manuelle'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          // No ELT Data
          <View style={styles.emptySection}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="radio-outline" size={64} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>Aucun ELT enregistré</Text>
            <Text style={styles.emptyText}>
              Ajoutez les informations de votre ELT manuellement ou scannez un rapport de maintenance pour les importer automatiquement.
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Ajouter un ELT</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Canadian Beacon Registry Link */}
        <View style={styles.registrySection}>
          <TouchableOpacity
            style={styles.registryButton}
            onPress={openBeaconRegistry}
          >
            <View style={styles.registryIconContainer}>
              <Ionicons name="globe-outline" size={24} color="#1E3A8A" />
            </View>
            <View style={styles.registryContent}>
              <Text style={styles.registryTitle}>Registre canadien des balises</Text>
              <Text style={styles.registrySubtitle}>
                Enregistrez ou mettez à jour votre balise ELT
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Info Notice */}
        <View style={styles.noticeSection}>
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.noticeText}>
              L'ELT doit être testé annuellement et la batterie remplacée selon les recommandations du fabricant (généralement 24 à 60 mois). Les exigences applicables peuvent varier selon l'aéronef et doivent être confirmées par le propriétaire ou un professionnel certifié.
            </Text>
          </View>
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
  editHeaderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  // Alerts
  alertsSection: {
    padding: 16,
    gap: 12,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  // Info Section
  infoSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
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
    paddingVertical: 12,
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
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sourceText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  // Form Section
  formSection: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  formRow: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formActions: {
    marginTop: 24,
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelFormButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelFormButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  // Empty State
  emptySection: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Registry Section
  registrySection: {
    padding: 16,
  },
  registryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1E3A8A',
    gap: 12,
  },
  registryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registryContent: {
    flex: 1,
  },
  registryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  registrySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  // Notice
  noticeSection: {
    padding: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
});
