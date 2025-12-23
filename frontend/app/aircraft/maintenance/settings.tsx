import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import api from '../../../services/api';

interface Aircraft {
  engine_hours: number;
  propeller_hours: number;
  airframe_hours: number;
}

export default function ComponentSettingsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [settings, setSettings] = useState({
    engine_model: '',
    engine_tbo_hours: '2000',
    engine_last_overhaul_hours: '',
    engine_last_overhaul_date: '',
    propeller_type: 'fixed',
    propeller_model: '',
    propeller_manufacturer_interval_years: '',
    propeller_last_inspection_hours: '',
    propeller_last_inspection_date: '',
    avionics_last_certification_date: '',
    magnetos_model: '',
    magnetos_interval_hours: '500',
    magnetos_last_inspection_hours: '',
    magnetos_last_inspection_date: '',
    vacuum_pump_model: '',
    vacuum_pump_interval_hours: '400',
    vacuum_pump_last_replacement_hours: '',
    vacuum_pump_last_replacement_date: '',
    airframe_last_annual_date: '',
    airframe_last_annual_hours: '',
  });

  useEffect(() => {
    console.log('[SETTINGS] Component mounted - aircraftId:', aircraftId);
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log('[SETTINGS] Fetching data for aircraft:', aircraftId);
    try {
      // Récupérer les heures actuelles de l'avion ET les paramètres
      const [aircraftRes, settingsRes] = await Promise.all([
        api.get(`/api/aircraft/${aircraftId}`),
        api.get(`/api/components/aircraft/${aircraftId}`)
      ]);
      
      console.log('[SETTINGS] Aircraft loaded:', JSON.stringify(aircraftRes.data));
      console.log('[SETTINGS] Settings loaded:', JSON.stringify(settingsRes.data));
      
      setAircraft(aircraftRes.data);
      const data = settingsRes.data;
      
      setSettings({
        engine_model: data.engine_model || '',
        engine_tbo_hours: String(data.engine_tbo_hours || 2000),
        engine_last_overhaul_hours: data.engine_last_overhaul_hours != null ? String(data.engine_last_overhaul_hours) : '',
        engine_last_overhaul_date: data.engine_last_overhaul_date || '',
        propeller_type: data.propeller_type || 'fixed',
        propeller_model: data.propeller_model || '',
        propeller_manufacturer_interval_years: data.propeller_manufacturer_interval_years != null ? String(data.propeller_manufacturer_interval_years) : '',
        propeller_last_inspection_hours: data.propeller_last_inspection_hours != null ? String(data.propeller_last_inspection_hours) : '',
        propeller_last_inspection_date: data.propeller_last_inspection_date || '',
        avionics_last_certification_date: data.avionics_last_certification_date || '',
        magnetos_model: data.magnetos_model || '',
        magnetos_interval_hours: String(data.magnetos_interval_hours || 500),
        magnetos_last_inspection_hours: data.magnetos_last_inspection_hours != null ? String(data.magnetos_last_inspection_hours) : '',
        magnetos_last_inspection_date: data.magnetos_last_inspection_date || '',
        vacuum_pump_model: data.vacuum_pump_model || '',
        vacuum_pump_interval_hours: String(data.vacuum_pump_interval_hours || 400),
        vacuum_pump_last_replacement_hours: data.vacuum_pump_last_replacement_hours != null ? String(data.vacuum_pump_last_replacement_hours) : '',
        vacuum_pump_last_replacement_date: data.vacuum_pump_last_replacement_date || '',
        airframe_last_annual_date: data.airframe_last_annual_date || '',
        airframe_last_annual_hours: data.airframe_last_annual_hours != null ? String(data.airframe_last_annual_hours) : '',
      });
      console.log('[SETTINGS] Settings state updated');
    } catch (error: any) {
      console.error('[SETTINGS] Error fetching data:', error);
      console.error('[SETTINGS] Error response:', error.response?.data);
      console.error('[SETTINGS] Error status:', error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('[SETTINGS] Save button pressed - aircraftId:', aircraftId);
    setSaving(true);
    
    try {
      const payload = {
        engine_model: settings.engine_model || null,
        engine_tbo_hours: parseFloat(settings.engine_tbo_hours) || 2000,
        engine_last_overhaul_hours: settings.engine_last_overhaul_hours ? parseFloat(settings.engine_last_overhaul_hours) : null,
        engine_last_overhaul_date: settings.engine_last_overhaul_date || null,
        propeller_type: settings.propeller_type,
        propeller_model: settings.propeller_model || null,
        propeller_manufacturer_interval_years: settings.propeller_manufacturer_interval_years ? parseFloat(settings.propeller_manufacturer_interval_years) : null,
        propeller_last_inspection_hours: settings.propeller_last_inspection_hours ? parseFloat(settings.propeller_last_inspection_hours) : null,
        propeller_last_inspection_date: settings.propeller_last_inspection_date || null,
        avionics_last_certification_date: settings.avionics_last_certification_date || null,
        magnetos_model: settings.magnetos_model || null,
        magnetos_interval_hours: parseFloat(settings.magnetos_interval_hours) || 500,
        magnetos_last_inspection_hours: settings.magnetos_last_inspection_hours ? parseFloat(settings.magnetos_last_inspection_hours) : null,
        magnetos_last_inspection_date: settings.magnetos_last_inspection_date || null,
        vacuum_pump_model: settings.vacuum_pump_model || null,
        vacuum_pump_interval_hours: parseFloat(settings.vacuum_pump_interval_hours) || 400,
        vacuum_pump_last_replacement_hours: settings.vacuum_pump_last_replacement_hours ? parseFloat(settings.vacuum_pump_last_replacement_hours) : null,
        vacuum_pump_last_replacement_date: settings.vacuum_pump_last_replacement_date || null,
        airframe_last_annual_date: settings.airframe_last_annual_date || null,
        airframe_last_annual_hours: settings.airframe_last_annual_hours ? parseFloat(settings.airframe_last_annual_hours) : null,
      };

      console.log('[SETTINGS] Calling API PUT:', `/api/components/aircraft/${aircraftId}`);
      console.log('[SETTINGS] Payload:', JSON.stringify(payload, null, 2));
      
      const response = await api.put(`/api/components/aircraft/${aircraftId}`, payload);
      console.log('[SETTINGS] API response status:', response.status);
      console.log('[SETTINGS] API response data:', JSON.stringify(response.data));
      
      Alert.alert('Succès', 'Paramètres sauvegardés. Les graphiques seront recalculés.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('[SETTINGS] Save error:', error);
      console.error('[SETTINGS] Error response:', error.response?.data);
      console.error('[SETTINGS] Error status:', error.response?.status);
      const errorMsg = error.response?.data?.detail || error.message || 'Impossible de sauvegarder';
      Alert.alert('Erreur', `${errorMsg}\n\nVérifiez votre connexion et réessayez.`);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Auto-fill current hours when setting "last work hours"
  const fillCurrentHours = (field: string, hoursType: 'engine' | 'propeller' | 'airframe') => {
    console.log('[SETTINGS] fillCurrentHours called - field:', field, 'hoursType:', hoursType);
    console.log('[SETTINGS] Aircraft data:', JSON.stringify(aircraft));
    
    if (!aircraft) {
      console.log('[SETTINGS] No aircraft data available');
      Alert.alert('Erreur', 'Données avion non disponibles');
      return;
    }
    
    let hours: number;
    if (hoursType === 'engine') {
      hours = aircraft.engine_hours || 0;
    } else if (hoursType === 'propeller') {
      hours = aircraft.propeller_hours || 0;
    } else {
      hours = aircraft.airframe_hours || 0;
    }
    
    console.log('[SETTINGS] Setting', field, 'to', hours);
    
    // Mise à jour directe du state
    setSettings(prevSettings => {
      const updated = { ...prevSettings, [field]: String(hours) };
      console.log('[SETTINGS] Updated settings:', field, '=', updated[field as keyof typeof updated]);
      return updated;
    });
    
    // Feedback visuel
    Alert.alert('✓', `${hours} heures appliquées`);
  };

  const renderSection = (title: string, icon: string, color: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const renderInput = (label: string, key: string, placeholder: string, keyboardType: 'default' | 'numeric' = 'default') => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={(settings as any)[key]}
        onChangeText={(v) => updateSetting(key, v)}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
      />
    </View>
  );

  const renderHoursInputWithButton = (label: string, key: string, hoursType: 'engine' | 'propeller' | 'airframe') => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={(settings as any)[key]}
          onChangeText={(v) => updateSetting(key, v)}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
        <TouchableOpacity 
          style={styles.fillButton}
          onPress={() => fillCurrentHours(key, hoursType)}
        >
          <Text style={styles.fillButtonText}>Actuel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Paramètres</Text>
            <Text style={styles.headerSubtitle}>{registration}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name="checkmark" size={28} color="#10B981" />
            )}
          </TouchableOpacity>
        </View>

        {aircraft && (
          <View style={styles.currentHours}>
            <Text style={styles.currentHoursTitle}>Heures actuelles (source de vérité)</Text>
            <View style={styles.currentHoursRow}>
              <Text style={styles.currentHoursItem}>Moteur: {aircraft.engine_hours?.toFixed(1) || 0} h</Text>
              <Text style={styles.currentHoursItem}>Hélice: {aircraft.propeller_hours?.toFixed(1) || 0} h</Text>
              <Text style={styles.currentHoursItem}>Cellule: {aircraft.airframe_hours?.toFixed(1) || 0} h</Text>
            </View>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderSection('Moteur', 'cog', '#3B82F6', (
            <>
              {renderInput('Modèle moteur', 'engine_model', 'Ex: IO-360-L2A')}
              {renderInput('TBO (heures)', 'engine_tbo_hours', '2000', 'numeric')}
              {renderHoursInputWithButton('Heures moteur à la dernière révision', 'engine_last_overhaul_hours', 'engine')}
              {renderInput('Date dernière révision', 'engine_last_overhaul_date', 'AAAA-MM-JJ')}
            </>
          ))}

          {renderSection('Hélice', 'sync-circle', '#8B5CF6', (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type d'hélice</Text>
                <View style={styles.toggleGroup}>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, settings.propeller_type === 'fixed' && styles.toggleBtnActive]}
                    onPress={() => updateSetting('propeller_type', 'fixed')}
                  >
                    <Text style={[styles.toggleText, settings.propeller_type === 'fixed' && styles.toggleTextActive]}>
                      Fixe (5 ans)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, settings.propeller_type === 'variable' && styles.toggleBtnActive]}
                    onPress={() => updateSetting('propeller_type', 'variable')}
                  >
                    <Text style={[styles.toggleText, settings.propeller_type === 'variable' && styles.toggleTextActive]}>
                      Variable (10 ans)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {renderInput('Modèle hélice', 'propeller_model', 'Ex: Hartzell HC-C2YK-1BF')}
              {settings.propeller_type === 'variable' && 
                renderInput('Intervalle fabricant (années)', 'propeller_manufacturer_interval_years', '10', 'numeric')
              }
              {renderInput('Date dernière inspection', 'propeller_last_inspection_date', 'AAAA-MM-JJ')}
            </>
          ))}

          {renderSection('Avionique (24 mois)', 'radio', '#F59E0B', (
            <>
              <Text style={styles.hint}>Altimètre / Pitot-statique / Transpondeur</Text>
              {renderInput('Date dernière certification', 'avionics_last_certification_date', 'AAAA-MM-JJ')}
            </>
          ))}

          {renderSection('Magnétos', 'flash', '#EF4444', (
            <>
              {renderInput('Modèle', 'magnetos_model', 'Ex: Slick 4371')}
              {renderInput('Intervalle (heures)', 'magnetos_interval_hours', '500', 'numeric')}
              {renderHoursInputWithButton('Heures moteur à la dernière inspection', 'magnetos_last_inspection_hours', 'engine')}
              {renderInput('Date dernière inspection', 'magnetos_last_inspection_date', 'AAAA-MM-JJ')}
            </>
          ))}

          {renderSection('Pompe à vide', 'speedometer', '#06B6D4', (
            <>
              {renderInput('Modèle', 'vacuum_pump_model', 'Ex: Rapco RA215CC')}
              {renderInput('Intervalle (heures)', 'vacuum_pump_interval_hours', '400', 'numeric')}
              {renderHoursInputWithButton('Heures moteur au dernier remplacement', 'vacuum_pump_last_replacement_hours', 'engine')}
              {renderInput('Date dernier remplacement', 'vacuum_pump_last_replacement_date', 'AAAA-MM-JJ')}
            </>
          ))}

          {renderSection('Cellule', 'airplane', '#10B981', (
            <>
              {renderInput('Date dernière annuelle', 'airframe_last_annual_date', 'AAAA-MM-JJ')}
              {renderHoursInputWithButton('Heures cellule à la dernière annuelle', 'airframe_last_annual_hours', 'airframe')}
            </>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Les graphiques se calculent automatiquement à partir des heures Aircraft et ces paramètres.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  currentHours: {
    backgroundColor: '#EFF6FF', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
  },
  currentHoursTitle: { fontSize: 12, fontWeight: '600', color: '#1E40AF', textAlign: 'center' },
  currentHoursRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  currentHoursItem: { fontSize: 12, color: '#1E40AF' },
  scrollContent: { padding: 16 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginLeft: 12 },
  hint: { fontSize: 12, color: '#64748B', marginBottom: 12, fontStyle: 'italic' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#1E293B',
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  fillButton: {
    backgroundColor: '#1E3A8A', paddingHorizontal: 12, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  fillButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  toggleGroup: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', backgroundColor: '#F8FAFC',
  },
  toggleBtnActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  toggleText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  toggleTextActive: { color: '#FFFFFF' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerNote: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' },
});
