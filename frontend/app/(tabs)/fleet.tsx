/**
 * Fleet Tab Screen - Shows shared aircraft for mechanics
 * Wraps the fleet.tsx screen for tab navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getSharedAircraft,
  getPendingInvitations,
  acceptShare,
  SharedAircraft,
  PendingInvitation,
} from '../../services/sharesService';

export default function FleetTabScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharedAircraft, setSharedAircraft] = useState<SharedAircraft[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [aircraft, invitations] = await Promise.all([
        getSharedAircraft(),
        getPendingInvitations(),
      ]);
      setSharedAircraft(aircraft);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error loading fleet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAcceptInvitation = async (invitation: PendingInvitation) => {
    Alert.alert(
      'Accepter l\'invitation',
      `Voulez-vous accepter l'accès à ${invitation.aircraft_registration} de ${invitation.owner_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            try {
              await acceptShare(invitation.share_id);
              Alert.alert('Succès', 'Accès accordé');
              loadData();
            } catch (error: any) {
              Alert.alert(
                'Erreur',
                error.response?.data?.detail || 'Impossible d\'accepter l\'invitation'
              );
            }
          },
        },
      ]
    );
  };

  const handleAircraftPress = (aircraft: SharedAircraft) => {
    router.push({
      pathname: '/aircraft/[id]',
      params: {
        id: aircraft.aircraft_id,
        sharedAccess: 'true',
        shareRole: aircraft.role,
        shareId: aircraft.share_id,
      },
    });
  };

  const getRoleLabel = (role: string): string => {
    return role === 'viewer' ? 'Lecture seule' : 'Contribution';
  };

  const getRoleColor = (role: string): string => {
    return role === 'viewer' ? '#3B82F6' : '#10B981';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CA');
  };

  const renderPendingInvitation = ({ item }: { item: PendingInvitation }) => (
    <View style={styles.invitationCard}>
      <View style={styles.invitationHeader}>
        <Ionicons name="mail" size={20} color="#F59E0B" />
        <Text style={styles.invitationTitle}>Invitation en attente</Text>
      </View>
      <View style={styles.invitationContent}>
        <Text style={styles.invitationAircraft}>{item.aircraft_registration}</Text>
        <Text style={styles.invitationModel}>{item.aircraft_model}</Text>
        <Text style={styles.invitationOwner}>
          De: {item.owner_name} ({item.owner_email})
        </Text>
        <View style={styles.invitationFooter}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
            <Text style={[styles.roleBadgeText, { color: getRoleColor(item.role) }]}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptInvitation(item)}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Accepter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAircraftCard = ({ item }: { item: SharedAircraft }) => (
    <TouchableOpacity
      style={styles.aircraftCard}
      onPress={() => handleAircraftPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.aircraftHeader}>
        <View style={styles.aircraftIcon}>
          <Ionicons name="airplane" size={24} color="#1E3A8A" />
        </View>
        <View style={styles.aircraftInfo}>
          <Text style={styles.aircraftRegistration}>{item.registration}</Text>
          <Text style={styles.aircraftModel}>
            {item.manufacturer} {item.model}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </View>

      <View style={styles.aircraftDetails}>
        <View style={styles.ownerInfo}>
          <Ionicons name="person" size={14} color="#64748B" />
          <Text style={styles.ownerText}>
            {item.owner_name}
          </Text>
        </View>

        <View style={styles.aircraftFooter}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
            <Text style={[styles.roleBadgeText, { color: getRoleColor(item.role) }]}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
          <Text style={styles.sharedSince}>
            Depuis {formatDate(item.shared_since)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  const isEmpty = sharedAircraft.length === 0 && pendingInvitations.length === 0;

  return (
    <View style={styles.container}>
      {/* Disclaimer TC-SAFE */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={16} color="#64748B" />
        <Text style={styles.disclaimerText}>
          Sync instantané des dossiers — Information seulement
        </Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Ionicons name="airplane-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyStateTitle}>Aucun aéronef partagé</Text>
          <Text style={styles.emptyStateText}>
            Les propriétaires peuvent vous inviter à consulter leurs dossiers de maintenance.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...pendingInvitations.map(i => ({ type: 'invitation' as const, data: i })),
            ...sharedAircraft.map(a => ({ type: 'aircraft' as const, data: a }))
          ]}
          renderItem={({ item }) =>
            item.type === 'invitation'
              ? renderPendingInvitation({ item: item.data as PendingInvitation })
              : renderAircraftCard({ item: item.data as SharedAircraft })
          }
          keyExtractor={(item) =>
            item.type === 'invitation'
              ? `inv-${(item.data as PendingInvitation).share_id}`
              : `air-${(item.data as SharedAircraft).aircraft_id}`
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  invitationCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  invitationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  invitationContent: {},
  invitationAircraft: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  invitationModel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  invitationOwner: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  invitationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  aircraftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aircraftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aircraftIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aircraftInfo: {
    flex: 1,
    marginLeft: 12,
  },
  aircraftRegistration: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  aircraftModel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  aircraftDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerText: {
    fontSize: 13,
    color: '#64748B',
  },
  aircraftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sharedSince: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
