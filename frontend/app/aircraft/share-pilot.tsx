/**
 * Share Pilot Screen - Create invite link for pilots
 * Owner can generate secure token links to share aircraft with pilots
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import * as Clipboard from 'expo-clipboard';

interface PilotInvite {
  invite_id: string;
  pilot_label: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  use_count: number;
  last_used_at?: string;
}

export default function SharePilotScreen() {
  const { aircraftId, registration } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pilotLabel, setPilotLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<PilotInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const response = await api.get(`/api/pilot-invites/aircraft/${aircraftId}/list`);
      setInvites(response.data);
    } catch (error) {
      console.error('Error loading invites:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const createInvite = async () => {
    if (!pilotLabel.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de pilote');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/pilot-invites/aircraft/${aircraftId}/create`, {
        pilot_label: pilotLabel.trim(),
        expires_days: 30
      });

      const inviteUrl = response.data.invite_url;
      // Build full URL
      const baseUrl = Platform.OS === 'web' ? window.location.origin : '';
      const fullUrl = `${baseUrl}${inviteUrl}`;
      
      setCreatedLink(fullUrl);
      setPilotLabel('');
      loadInvites();

      // Copy to clipboard
      await Clipboard.setStringAsync(fullUrl);
      
      Alert.alert(
        'Lien créé !',
        `Le lien pour "${response.data.pilot_label}" a été copié dans le presse-papiers.\n\nValide 30 jours.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de créer le lien');
    } finally {
      setLoading(false);
    }
  };

  const shareLink = async (link: string, pilotName: string) => {
    try {
      await Share.share({
        message: `Accès au suivi de vol de ${registration}:\n\n${link}`,
        title: `Invitation pilote - ${registration}`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyLink = async (link: string) => {
    await Clipboard.setStringAsync(link);
    Alert.alert('Copié !', 'Le lien a été copié dans le presse-papiers');
  };

  const revokeInvite = async (inviteId: string, pilotName: string) => {
    Alert.alert(
      'Révoquer l\'accès',
      `Révoquer l'accès de "${pilotName}" ?\n\nLe lien ne fonctionnera plus.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/api/pilot-invites/revoke/${inviteId}`);
              loadInvites();
              Alert.alert('Succès', 'Accès révoqué');
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Erreur');
            }
          }
        }
      ]
    );
  };

  const renderInvite = ({ item }: { item: PilotInvite }) => {
    const expiresDate = new Date(item.expires_at);
    const isExpired = item.is_expired || new Date() > expiresDate;
    
    return (
      <View style={[styles.inviteCard, isExpired && styles.inviteCardExpired]}>
        <View style={styles.inviteHeader}>
          <View style={styles.inviteInfo}>
            <View style={styles.pilotBadge}>
              <Ionicons name="person" size={14} color="#10B981" />
              <Text style={styles.pilotName}>{item.pilot_label}</Text>
            </View>
            {isExpired ? (
              <View style={styles.statusBadgeExpired}>
                <Text style={styles.statusTextExpired}>Expiré</Text>
              </View>
            ) : (
              <View style={styles.statusBadgeActive}>
                <Text style={styles.statusTextActive}>Actif</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.inviteDetails}>
          <Text style={styles.inviteDetailText}>
            Créé le {new Date(item.created_at).toLocaleDateString('fr-FR')}
          </Text>
          <Text style={styles.inviteDetailText}>
            Expire le {expiresDate.toLocaleDateString('fr-FR')}
          </Text>
          {item.use_count > 0 && (
            <Text style={styles.inviteDetailText}>
              Utilisé {item.use_count} fois
            </Text>
          )}
        </View>

        {!isExpired && (
          <View style={styles.inviteActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => revokeInvite(item.invite_id, item.pilot_label)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Révoquer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partager avec pilote</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Aircraft Info */}
        <View style={styles.aircraftBanner}>
          <Ionicons name="airplane" size={24} color="#1E3A8A" />
          <Text style={styles.aircraftRegistration}>{registration}</Text>
        </View>

        {/* Create New Invite */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Créer un nouveau lien</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nom du pilote</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Alex, Jean-Pierre..."
              placeholderTextColor="#94A3B8"
              value={pilotLabel}
              onChangeText={setPilotLabel}
              maxLength={50}
            />
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={createInvite}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="link" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Générer le lien</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            Le lien sera valide 30 jours. Le pilote pourra uniquement activer/arrêter le suivi de vol.
          </Text>
        </View>

        {/* Created Link */}
        {createdLink && (
          <View style={styles.createdLinkContainer}>
            <Text style={styles.createdLinkLabel}>Lien créé :</Text>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={2}>{createdLink}</Text>
            </View>
            <View style={styles.linkActions}>
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => copyLink(createdLink)}
              >
                <Ionicons name="copy-outline" size={18} color="#3B82F6" />
                <Text style={styles.linkButtonText}>Copier</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => shareLink(createdLink, '')}
              >
                <Ionicons name="share-outline" size={18} color="#3B82F6" />
                <Text style={styles.linkButtonText}>Partager</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Existing Invites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liens actifs</Text>
          
          {loadingInvites ? (
            <ActivityIndicator size="small" color="#1E3A8A" style={{ marginTop: 20 }} />
          ) : invites.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>Aucun lien créé</Text>
            </View>
          ) : (
            invites.map((invite) => (
              <View key={invite.invite_id}>
                {renderInvite({ item: invite })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  aircraftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 24,
  },
  aircraftRegistration: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1E293B',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  createdLinkContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  createdLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  linkBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 13,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  linkActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  inviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inviteCardExpired: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },
  inviteHeader: {
    marginBottom: 12,
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pilotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pilotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  statusBadgeExpired: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextExpired: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  inviteDetails: {
    gap: 4,
  },
  inviteDetailText: {
    fontSize: 13,
    color: '#64748B',
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
