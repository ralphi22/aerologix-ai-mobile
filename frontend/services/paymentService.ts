/**
 * Payment Service - Stripe subscription management
 */

import api from './api';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Types
export type PlanId = 'solo' | 'pro' | 'fleet';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export interface PlanLimits {
  max_aircrafts: number;
  has_fleet_access: boolean;
  has_mechanic_sharing: boolean;
  ocr_per_month: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan_id: PlanId;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionResponse {
  has_subscription: boolean;
  subscription: Subscription | null;
  plan_limits: PlanLimits;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface PortalSessionResponse {
  portal_url: string;
}

// Plan pricing info (CAD)
export const PLAN_PRICING: Record<PlanId, {
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  color: string;
  popular?: boolean;
  features: string[];
}> = {
  solo: {
    name: 'Solo',
    description: '1 aéronef, synchronisation de base',
    monthly: 9.99,
    yearly: 99.90,
    color: '#3B82F6',
    features: [
      '1 aéronef',
      '10 numérisations OCR/mois',
      'Tableau de bord maintenance',
      'Alertes visuelles TC-Safe',
    ],
  },
  pro: {
    name: 'Maintenance Pro',
    description: 'Jusqu\'à 3 aéronefs, partage TEA/AMO',
    monthly: 24.99,
    yearly: 249.90,
    color: '#8B5CF6',
    popular: true,
    features: [
      'Jusqu\'à 3 aéronefs',
      '50 numérisations OCR/mois',
      'Partage avec TEA/AMO',
      'Gestion des pièces',
      'Historique complet',
    ],
  },
  fleet: {
    name: 'Fleet AI',
    description: 'Aéronefs illimités, vue Fleet complète',
    monthly: 79.99,
    yearly: 799.90,
    color: '#F59E0B',
    features: [
      'Aéronefs illimités',
      'OCR illimité',
      'Vue Fleet complète',
      'Analytique avancée',
      'Support prioritaire',
      'API accès',
    ],
  },
};

/**
 * Get current user's subscription
 */
export const getSubscription = async (): Promise<SubscriptionResponse> => {
  const response = await api.get('/api/payments/subscription');
  return response.data;
};

/**
 * Create a Stripe Checkout session
 */
export const createCheckoutSession = async (
  planId: PlanId,
  billingCycle: BillingCycle
): Promise<CheckoutSessionResponse> => {
  const response = await api.post('/api/payments/create-checkout-session', {
    plan_id: planId,
    billing_cycle: billingCycle,
  });
  return response.data;
};

/**
 * Open Stripe Checkout in browser
 */
export const openCheckout = async (
  planId: PlanId,
  billingCycle: BillingCycle
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Create checkout session
    const { checkout_url } = await createCheckoutSession(planId, billingCycle);
    
    // Open in browser
    const result = await WebBrowser.openBrowserAsync(checkout_url, {
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
    
    // Check result
    if (result.type === 'cancel') {
      return { success: false, error: 'Paiement annulé' };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Checkout error:', error);
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Erreur lors du paiement' 
    };
  }
};

/**
 * Cancel current subscription (at period end)
 */
export const cancelSubscription = async (): Promise<{ message: string; current_period_end: string }> => {
  const response = await api.post('/api/payments/cancel');
  return response.data;
};

/**
 * Open Stripe Customer Portal
 */
export const openCustomerPortal = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.post('/api/payments/portal');
    const { portal_url } = response.data as PortalSessionResponse;
    
    await WebBrowser.openBrowserAsync(portal_url, {
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Portal error:', error);
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Erreur lors de l\'ouverture du portail' 
    };
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number, billingCycle: BillingCycle): string => {
  const formatted = price.toFixed(2);
  return `${formatted}$ CAD/${billingCycle === 'monthly' ? 'mois' : 'an'}`;
};

/**
 * Get savings percentage for yearly billing
 */
export const getYearlySavings = (planId: PlanId): number => {
  const plan = PLAN_PRICING[planId];
  const monthlyTotal = plan.monthly * 12;
  const savings = ((monthlyTotal - plan.yearly) / monthlyTotal) * 100;
  return Math.round(savings);
};
