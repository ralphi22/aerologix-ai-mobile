/**
 * Share Aircraft Screen - Owner invites TEA/AMO
 * TC-SAFE: Information only - owner and certified maintenance personnel remain responsible
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  inviteMechanic,
  revokeShare,
  getAircraftShares,
  AircraftShareInfo,
  ShareRole,
} from '../../services/sharesService';

export default function ShareAircraftScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('viewer');
  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(true);
  const [shares, setShares] = useState<AircraftShareInfo[]>([]);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      setLoadingShares(true);
      const data = await getAircraftShares(aircraftId as string);
      setShares(data);
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un courriel');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Erreur', 'Veuillez entrer un courriel valide');
      return;
    }

    try {
      setLoading(true);
      await inviteMechanic({
        aircraft_id: aircraftId as string,
        mechanic_email: email.trim().toLowerCase(),
        role,
      });
      Alert.alert('Succès', 'Invitation envoyée');
      setEmail('');
      loadShares();
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible d\'envoyer l\'invitation'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string, mechanicEmail: string) => {
    Alert.alert(
      'Révoquer l\'accès',
      `Voulez-vous révoquer l'accès de ${mechanicEmail} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeShare(shareId);
              Alert.alert('Succès', 'Accès révoqué');
              loadShares();
            } catch (error: any) {
              Alert.alert(
                'Erreur',
                error.response?.data?.detail || 'Impossible de révoquer l\'accès'
              );
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (r: ShareRole): string => {
    return r === 'viewer' ? 'Lecture seule' : 'Contribution';
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'active':
        return 'Actif';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'active':
        return '#10B981';
      default:
        return '#94A3B8';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Partager avec TEA/AMO</Text>
          <Text style={styles.headerSubtitle}>{registration}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Disclaimer TC-SAFE */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={16} color="#64748B" />
            <Text style={styles.disclaimerText}>
              Le propriétaire et le TEA/AMO demeurent responsables des décisions et des registres officiels.
            </Text>
          </View>

          {/* Invite Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nouvelle invitation</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Courriel du TEA/AMO</Text>
              <TextInput
                style={styles.input}
                placeholder="exemple@courriel.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.roleContainer}>
              <Text style={styles.label}>Niveau d'accès</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[styles.roleButton, role === 'viewer' && styles.roleButtonActive]}
                  onPress={() => setRole('viewer')}
                >
                  <Ionicons
                    name="eye"
                    size={18}
                    color={role === 'viewer' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[styles.roleButtonText, role === 'viewer' && styles.roleButtonTextActive]}
                  >
                    Lecture seule
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, role === 'contributor' && styles.roleButtonActive]}
                  onPress={() => setRole('contributor')}
                >
                  <Ionicons
                    name="create"
                    size={18}
                    color={role === 'contributor' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === 'contributor' && styles.roleButtonTextActive,
                    ]}
                  >
                    Contribution
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.roleHint}>
                {role === 'viewer'
                  ? 'Peut consulter les dossiers de maintenance, pièces et factures.'
                  : 'Peut ajouter des rapports, pièces et factures. Ne peut pas supprimer.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.inviteButton, loading && styles.inviteButtonDisabled]}
              onPress={handleInvite}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.inviteButtonText}>Envoyer l'invitation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Existing Shares */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accès existants</Text>

            {loadingShares ? (
              <ActivityIndicator color="#1E3A8A" style={{ marginTop: 20 }} />
            ) : shares.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>Aucun partage actif</Text>
              </View>
            ) : (
              shares.map((share) => (
                <View key={share.share_id} style={styles.shareCard}>
                  <View style={styles.shareInfo}>
                    <Text style={styles.shareEmail}>{share.mechanic_email}</Text>
                    <View style={styles.shareDetails}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(share.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(share.status) }]}>
                          {getStatusLabel(share.status)}
                        </Text>
                      </View>
                      <Text style={styles.roleText}>{getRoleLabel(share.role)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.revokeButton}
                    onPress={() => handleRevoke(share.share_id, share.mechanic_email)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
  },
  roleButtonActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  roleHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 14,
  },
  inviteButtonDisabled: {
    opacity: 0.7,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  shareInfo: {
    flex: 1,
  },
  shareEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  shareDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleText: {
    fontSize: 12,
    color: '#64748B',
  },
  revokeButton: {
    padding: 4,
  },
});
