import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  getSubscription,
  openCheckout,
  openCustomerPortal,
  cancelSubscription,
  PLAN_PRICING,
  formatPrice,
  getYearlySavings,
  PlanId,
  BillingCycle,
  SubscriptionResponse,
} from '../services/paymentService';

export default function SubscriptionScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<PlanId | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionResponse | null>(null);

  // Check for success/cancel params from Stripe redirect
  useEffect(() => {
    if (params.success === 'true') {
      Alert.alert(
        '✅ Paiement réussi !',
        'Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités de votre nouveau plan !',
        [{ text: 'Super !', onPress: () => fetchSubscription() }]
      );
    } else if (params.canceled === 'true') {
      Alert.alert(
        'Paiement annulé',
        'Vous avez annulé le processus de paiement. Vous pouvez réessayer à tout moment.'
      );
    }
  }, [params]);

  const fetchSubscription = useCallback(async () => {
    try {
      const data = await getSubscription();
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubscription();
  }, [fetchSubscription]);

  const handleSubscribe = async (planId: PlanId) => {
    // Check if already on this plan
    if (subscriptionData?.subscription?.plan_id === planId) {
      Alert.alert('Info', 'Vous êtes déjà sur ce forfait');
      return;
    }

    // If already has subscription, redirect to portal
    if (subscriptionData?.has_subscription) {
      Alert.alert(
        'Modifier votre abonnement',
        'Vous avez déjà un abonnement actif. Utilisez le portail client Stripe pour modifier ou mettre à niveau votre plan.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ouvrir le portail', onPress: handleOpenPortal }
        ]
      );
      return;
    }

    setProcessingPlan(planId);

    try {
      const result = await openCheckout(planId, billingCycle);
      
      if (!result.success && result.error) {
        Alert.alert('Erreur', result.error);
      }
      
      // Refresh subscription after checkout
      await fetchSubscription();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    const result = await openCustomerPortal();
    if (!result.success && result.error) {
      Alert.alert('Erreur', result.error);
    }
    // Refresh after portal
    await fetchSubscription();
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Annuler l\'abonnement',
      'Êtes-vous sûr de vouloir annuler votre abonnement ? Vous aurez accès jusqu\'à la fin de la période en cours.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await cancelSubscription();
              Alert.alert('Abonnement annulé', result.message);
              await fetchSubscription();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Erreur lors de l\'annulation');
            }
          }
        }
      ]
    );
  };

  const getPlanColor = (planId: PlanId): string => {
    return PLAN_PRICING[planId]?.color || '#94A3B8';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  const currentPlanId = subscriptionData?.subscription?.plan_id;
  const hasActiveSubscription = subscriptionData?.has_subscription && 
    subscriptionData.subscription?.status === 'active';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Abonnements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Subscription Card */}
        {hasActiveSubscription && subscriptionData?.subscription && (
          <View style={styles.currentSubscriptionCard}>
            <View style={styles.currentSubHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.currentSubTitle}>Abonnement actif</Text>
            </View>
            
            <View style={styles.currentSubDetails}>
              <Text style={styles.currentPlanName}>
                {PLAN_PRICING[currentPlanId as PlanId]?.name || currentPlanId}
              </Text>
              <Text style={styles.currentSubPeriod}>
                {subscriptionData.subscription.billing_cycle === 'monthly' ? 'Mensuel' : 'Annuel'}
              </Text>
            </View>

            <View style={styles.currentSubInfo}>
              <Text style={styles.currentSubInfoText}>
                Prochaine facturation : {formatDate(subscriptionData.subscription.current_period_end)}
              </Text>
              {subscriptionData.subscription.cancel_at_period_end && (
                <Text style={styles.cancelWarning}>
                  ⚠️ Sera annulé à la fin de la période
                </Text>
              )}
            </View>

            <View style={styles.currentSubActions}>
              <TouchableOpacity 
                style={styles.portalButton}
                onPress={handleOpenPortal}
              >
                <Ionicons name="settings-outline" size={18} color="#1E3A8A" />
                <Text style={styles.portalButtonText}>Gérer l'abonnement</Text>
              </TouchableOpacity>

              {!subscriptionData.subscription.cancel_at_period_end && (
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancelSubscription}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {hasActiveSubscription ? 'Changer de forfait' : 'Choisissez votre forfait'}
          </Text>
          <Text style={styles.subtitle}>
            Synchronisation des dossiers de maintenance aéronautique
          </Text>

          {/* Billing Toggle */}
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton, 
                billingCycle === 'monthly' && styles.toggleButtonActive
              ]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[
                styles.toggleText, 
                billingCycle === 'monthly' && styles.toggleTextActive
              ]}>
                Mensuel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton, 
                billingCycle === 'yearly' && styles.toggleButtonActive
              ]}
              onPress={() => setBillingCycle('yearly')}
            >
              <Text style={[
                styles.toggleText, 
                billingCycle === 'yearly' && styles.toggleTextActive
              ]}>
                Annuel (-17%)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {(Object.keys(PLAN_PRICING) as PlanId[]).map((planId) => {
            const plan = PLAN_PRICING[planId];
            const isCurrentPlan = currentPlanId === planId;
            const isProcessing = processingPlan === planId;
            const price = billingCycle === 'monthly' ? plan.monthly : plan.yearly;

            return (
              <View
                key={planId}
                style={[
                  styles.planCard,
                  isCurrentPlan && { borderColor: plan.color, borderWidth: 3 },
                  plan.popular && styles.popularCard
                ]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>POPULAIRE</Text>
                  </View>
                )}

                {isCurrentPlan && (
                  <View style={[styles.currentBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.currentBadgeText}>Plan actuel</Text>
                  </View>
                )}

                <View style={[styles.planHeader, { backgroundColor: plan.color }]}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>

                <View style={styles.planPricing}>
                  <Text style={styles.planPrice}>${price.toFixed(2)}</Text>
                  <Text style={styles.planPeriod}>
                    CAD/{billingCycle === 'monthly' ? 'mois' : 'an'}
                  </Text>
                </View>

                {billingCycle === 'yearly' && (
                  <Text style={styles.savingsText}>
                    Économisez {getYearlySavings(planId)}% vs mensuel
                  </Text>
                )}

                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    isCurrentPlan
                      ? { backgroundColor: '#E2E8F0' }
                      : { backgroundColor: plan.color },
                    isProcessing && { opacity: 0.7 }
                  ]}
                  onPress={() => handleSubscribe(planId)}
                  disabled={isCurrentPlan || isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.subscribeButtonText,
                      isCurrentPlan && { color: '#64748B' }
                    ]}>
                      {isCurrentPlan ? 'Plan actuel' : 'S\'abonner'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.securityText}>Paiement sécurisé par Stripe</Text>
          </View>
          
          <Text style={styles.footerText}>
            Annulable à tout moment. Pas de frais cachés.
          </Text>
          
          <Text style={styles.disclaimerText}>
            Information seulement — le propriétaire et le TEA/AMO demeurent 
            responsables des décisions et des registres officiels.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  // Current Subscription Card
  currentSubscriptionCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  currentSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  currentSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  currentSubDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  currentSubPeriod: {
    fontSize: 14,
    color: '#64748B',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentSubInfo: {
    marginBottom: 16,
  },
  currentSubInfoText: {
    fontSize: 14,
    color: '#475569',
  },
  cancelWarning: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
  currentSubActions: {
    flexDirection: 'row',
    gap: 12,
  },
  portalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  portalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Header
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  billingToggle: {
    flexDirection: 'row',
    marginTop: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#1E3A8A',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  // Plans
  plansContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  popularCard: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  currentBadge: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  planHeader: {
    padding: 20,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  planDescription: {
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  planPeriod: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  savingsText: {
    fontSize: 13,
    color: '#10B981',
    paddingHorizontal: 20,
    marginTop: 4,
    fontWeight: '600',
  },
  featuresContainer: {
    padding: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  subscribeButton: {
    margin: 20,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Footer
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
});
