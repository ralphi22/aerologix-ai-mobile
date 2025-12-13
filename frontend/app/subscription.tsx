import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'expo-router';
import api from '../services/api';

interface Plan {
  tier: string;
  name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  trial_days: number;
  features: {
    max_aircrafts: number;
    ocr_per_month: number;
    logbook_entries_per_month: number;
    has_predictive_maintenance: boolean;
    has_auto_notifications: boolean;
    has_parts_comparator: boolean;
    has_priority_support: boolean;
    has_mechanic_sharing: boolean;
    has_advanced_analytics: boolean;
  };
}

export default function SubscriptionScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/api/plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case 'BASIC':
        return '#94A3B8';
      case 'PILOT':
        return '#3B82F6';
      case 'MAINTENANCE_PRO':
        return '#8B5CF6';
      case 'FLEET_AI':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
  };

  const handleUpgrade = (plan: Plan) => {
    if (user && user.subscription.plan === plan.tier) {
      alert('Vous êtes déjà sur ce forfait');
      return;
    }

    alert(
      'Intégration Stripe à venir !\n\n' +
      `Pour passer au forfait ${plan.name}, vous pourrez :\n` +
      `• Payer ${billingCycle === 'monthly' ? `${plan.monthly_price}$/mois` : `${plan.annual_price}$/an`}\n` +
      `• Profiter de ${plan.trial_days} jours d'essai gratuit\n` +
      `• Annuler à tout moment\n\n` +
      'Le paiement Stripe sera intégré prochainement avec vos vraies clés Stripe.'
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Abonnements</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choisissez votre forfait</Text>
        <Text style={styles.subtitle}>Passez à un plan supérieur à tout moment</Text>

        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, billingCycle === 'monthly' && styles.toggleButtonActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
              Mensuel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, billingCycle === 'annual' && styles.toggleButtonActive]}
            onPress={() => setBillingCycle('annual')}
          >
            <Text style={[styles.toggleText, billingCycle === 'annual' && styles.toggleTextActive]}>
              Annuel (-20%)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.plansContainer}>
        {plans.map((plan) => {
          const isCurrentPlan = user?.subscription.plan === plan.tier;
          const planColor = getPlanColor(plan.tier);

          return (
            <View
              key={plan.tier}
              style={[
                styles.planCard,
                isCurrentPlan && { borderColor: planColor, borderWidth: 3 },
              ]}
            >
              {isCurrentPlan && (
                <View style={[styles.currentBadge, { backgroundColor: planColor }]}>
                  <Text style={styles.currentBadgeText}>Plan actuel</Text>
                </View>
              )}

              <View style={[styles.planHeader, { backgroundColor: planColor }]}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
              </View>

              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>
                  ${billingCycle === 'monthly' ? plan.monthly_price : plan.annual_price}
                </Text>
                <Text style={styles.planPeriod}>
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </Text>
              </View>

              {plan.trial_days > 0 && (
                <Text style={styles.trialText}>{plan.trial_days} days free trial</Text>
              )}

              <View style={styles.featuresContainer}>
                <View style={styles.featureRow}>
                  <Ionicons name="airplane" size={16} color="#1E3A8A" />
                  <Text style={styles.featureText}>
                    {plan.features.max_aircrafts === -1
                      ? 'Avions illimités'
                      : `${plan.features.max_aircrafts} avion${plan.features.max_aircrafts > 1 ? 's' : ''}`}
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <Ionicons name="camera" size={16} color="#1E3A8A" />
                  <Text style={styles.featureText}>
                    {plan.features.ocr_per_month === -1
                      ? 'OCR illimité'
                      : `${plan.features.ocr_per_month} OCR/mois`}
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <Ionicons name="book" size={16} color="#1E3A8A" />
                  <Text style={styles.featureText}>
                    {plan.features.logbook_entries_per_month === -1
                      ? 'Carnet de vol illimité'
                      : `${plan.features.logbook_entries_per_month} entrées/mois`}
                  </Text>
                </View>

                {plan.features.has_predictive_maintenance && (
                  <View style={styles.featureRow}>
                    <Ionicons name="analytics" size={16} color="#10B981" />
                    <Text style={styles.featureText}>Maintenance prédictive</Text>
                  </View>
                )}

                {plan.features.has_auto_notifications && (
                  <View style={styles.featureRow}>
                    <Ionicons name="notifications" size={16} color="#10B981" />
                    <Text style={styles.featureText}>Notifications auto</Text>
                  </View>
                )}

                {plan.features.has_mechanic_sharing && (
                  <View style={styles.featureRow}>
                    <Ionicons name="share-social" size={16} color="#10B981" />
                    <Text style={styles.featureText}>Partage mécanicien</Text>
                  </View>
                )}

                {plan.features.has_parts_comparator && (
                  <View style={styles.featureRow}>
                    <Ionicons name="git-compare" size={16} color="#10B981" />
                    <Text style={styles.featureText}>Comparateur de pièces</Text>
                  </View>
                )}

                {plan.features.has_priority_support && (
                  <View style={styles.featureRow}>
                    <Ionicons name="headset" size={16} color="#10B981" />
                    <Text style={styles.featureText}>Support prioritaire</Text>
                  </View>
                )}

                {plan.features.has_advanced_analytics && (
                  <View style={styles.featureRow}>
                    <Ionicons name="stats-chart" size={16} color="#10B981" />
                    <Text style={styles.featureText}>Analytique avancée</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  isCurrentPlan
                    ? { backgroundColor: '#E2E8F0' }
                    : { backgroundColor: planColor },
                ]}
                onPress={() => handleUpgrade(plan)}
                disabled={isCurrentPlan}
              >
                <Text
                  style={[
                    styles.upgradeButtonText,
                    isCurrentPlan && { color: '#64748B' },
                  ]}
                >
                  {isCurrentPlan ? 'Plan actuel' : 'Passer à ce forfait'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tous les abonnements incluent un paiement sécurisé via Stripe et peuvent être annulés à tout moment.
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
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
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
  plansContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  planDescription: {
    fontSize: 14,
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  planPeriod: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 4,
  },
  trialText: {
    fontSize: 14,
    color: '#10B981',
    paddingHorizontal: 20,
    marginTop: 4,
    fontWeight: '600',
  },
  featuresContainer: {
    padding: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  upgradeButton: {
    margin: 20,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
