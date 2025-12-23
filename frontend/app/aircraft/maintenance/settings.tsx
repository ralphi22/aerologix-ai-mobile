import React, { useEffect, useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../../services/api';

export default function ComponentSettingsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    engine_model: '',
    engine_tbo_hours: '2000',
    engine_hours_since_overhaul: '',
    engine_last_overhaul_date: '',
    propeller_type: 'fixed',
    propeller_model: '',
    propeller_manufacturer_interval_years: '',
    propeller_hours_since_inspection: '',
    propeller_last_inspection_date: '',
    avionics_last_certification_date: '',
    magnetos_model: '',
    magnetos_interval_hours: '500',
    magnetos_hours_since_inspection: '',
    vacuum_pump_model: '',
    vacuum_pump_interval_hours: '400',
    vacuum_pump_hours_since_replacement: '',
    airframe_last_annual_date: '',
    airframe_hours_since_annual: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get(`/api/components/aircraft/${aircraftId}`);
      const data = response.data;
      setSettings({
        engine_model: data.engine_model || '',
        engine_tbo_hours: String(data.engine_tbo_hours || 2000),
        engine_hours_since_overhaul: data.engine_hours_since_overhaul ? String(data.engine_hours_since_overhaul) : '',
        engine_last_overhaul_date: data.engine_last_overhaul_date || '',
        propeller_type: data.propeller_type || 'fixed',
        propeller_model: data.propeller_model || '',
        propeller_manufacturer_interval_years: data.propeller_manufacturer_interval_years ? String(data.propeller_manufacturer_interval_years) : '',
        propeller_hours_since_inspection: data.propeller_hours_since_inspection ? String(data.propeller_hours_since_inspection) : '',
        propeller_last_inspection_date: data.propeller_last_inspection_date || '',
        avionics_last_certification_date: data.avionics_last_certification_date || '',
        magnetos_model: data.magnetos_model || '',
        magnetos_interval_hours: String(data.magnetos_interval_hours || 500),
        magnetos_hours_since_inspection: data.magnetos_hours_since_inspection ? String(data.magnetos_hours_since_inspection) : '',
        vacuum_pump_model: data.vacuum_pump_model || '',
        vacuum_pump_interval_hours: String(data.vacuum_pump_interval_hours || 400),
        vacuum_pump_hours_since_replacement: data.vacuum_pump_hours_since_replacement ? String(data.vacuum_pump_hours_since_replacement) : '',
        airframe_last_annual_date: data.airframe_last_annual_date || '',
        airframe_hours_since_annual: data.airframe_hours_since_annual ? String(data.airframe_hours_since_annual) : '',
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        engine_model: settings.engine_model || null,
        engine_tbo_hours: parseFloat(settings.engine_tbo_hours) || 2000,
        engine_hours_since_overhaul: settings.engine_hours_since_overhaul ? parseFloat(settings.engine_hours_since_overhaul) : null,
        engine_last_overhaul_date: settings.engine_last_overhaul_date || null,
        propeller_type: settings.propeller_type,
        propeller_model: settings.propeller_model || null,
        propeller_manufacturer_interval_years: settings.propeller_manufacturer_interval_years ? parseFloat(settings.propeller_manufacturer_interval_years) : null,
        propeller_hours_since_inspection: settings.propeller_hours_since_inspection ? parseFloat(settings.propeller_hours_since_inspection) : null,
        propeller_last_inspection_date: settings.propeller_last_inspection_date || null,
        avionics_last_certification_date: settings.avionics_last_certification_date || null,
        magnetos_model: settings.magnetos_model || null,
        magnetos_interval_hours: parseFloat(settings.magnetos_interval_hours) || 500,
        magnetos_hours_since_inspection: settings.magnetos_hours_since_inspection ? parseFloat(settings.magnetos_hours_since_inspection) : null,
        vacuum_pump_model: settings.vacuum_pump_model || null,
        vacuum_pump_interval_hours: parseFloat(settings.vacuum_pump_interval_hours) || 400,
        vacuum_pump_hours_since_replacement: settings.vacuum_pump_hours_since_replacement ? parseFloat(settings.vacuum_pump_hours_since_replacement) : null,
        airframe_last_annual_date: settings.airframe_last_annual_date || null,
        airframe_hours_since_annual: settings.airframe_hours_since_annual ? parseFloat(settings.airframe_hours_since_annual) : null,
      };

      await api.put(`/api/components/aircraft/${aircraftId}`, payload);
      Alert.alert('Succès', 'Paramètres sauvegardés');
      router.back();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
              <ActivityIndicator size="small" color="#1E3A8A" />
            ) : (
              <Ionicons name="checkmark" size={28} color="#10B981" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderSection('Moteur', 'cog', '#3B82F6', (
            <>
              {renderInput('Modèle moteur', 'engine_model', 'Ex: IO-360-L2A')}
              {renderInput('TBO (heures)', 'engine_tbo_hours', '2000', 'numeric')}
              {renderInput('Heures depuis révision', 'engine_hours_since_overhaul', '0', 'numeric')}
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
              {renderInput('Heures depuis inspection', 'magnetos_hours_since_inspection', '0', 'numeric')}
            </>
          ))}

          {renderSection('Pompe à vide', 'speedometer', '#06B6D4', (
            <>
              {renderInput('Modèle', 'vacuum_pump_model', 'Ex: Rapco RA215CC')}
              {renderInput('Intervalle (heures)', 'vacuum_pump_interval_hours', '400', 'numeric')}
              {renderInput('Heures depuis remplacement', 'vacuum_pump_hours_since_replacement', '0', 'numeric')}
            </>
          ))}

          {renderSection('Cellule', 'airplane', '#10B981', (
            <>
              {renderInput('Date dernière annuelle', 'airframe_last_annual_date', 'AAAA-MM-JJ')}
              {renderInput('Heures depuis annuelle', 'airframe_hours_since_annual', '0', 'numeric')}
            </>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Les valeurs par défaut sont basées sur Transport Canada Standard 625
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
