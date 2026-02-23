'use client';

import { useCurrentUser } from './use-current-user';

const SUBSCRIPTION_EXEMPT_ROLES = ["beta", "lifetime", "admin"];

export type SubscriptionStatus =
  | "active"        // Has active Stripe subscription
  | "trialing"      // In trial period
  | "expired"       // Had subscription before, now cancelled (returning user)
  | "none"          // Never had a subscription (new user)
  | "partner"       // Access through partner relationship
  | "exempt";       // Exempt role (beta, lifetime, admin)

interface SubscriptionGate {
  /** Whether the user can only view data (no mutations) */
  isReadOnly: boolean;
  /** Whether the user has full access */
  hasFullAccess: boolean;
  /** The current subscription status */
  status: SubscriptionStatus;
  /** Whether user previously had a subscription (for messaging) */
  isReturningUser: boolean;
  /** Whether data is still loading */
  isLoading: boolean;
}

/**
 * Hook to determine subscription-based access level.
 * Users without active subscriptions get read-only access to their data.
 */
export function useSubscriptionGate(): SubscriptionGate {
  const { user, hasPartnerAccess, hasBudget, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return {
      isReadOnly: false,
      hasFullAccess: false,
      status: "none",
      isReturningUser: false,
      isLoading: true,
    };
  }

  // Check exempt roles
  if (user.role && SUBSCRIPTION_EXEMPT_ROLES.includes(user.role)) {
    return {
      isReadOnly: false,
      hasFullAccess: true,
      status: "exempt",
      isReturningUser: false,
      isLoading: false,
    };
  }

  // Check partner access
  if (hasPartnerAccess) {
    return {
      isReadOnly: false,
      hasFullAccess: true,
      status: "partner",
      isReturningUser: false,
      isLoading: false,
    };
  }

  // Check active subscription
  if (user.stripeSubscriptionId) {
    const isTrialing = user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
    return {
      isReadOnly: false,
      hasFullAccess: true,
      status: isTrialing ? "trialing" : "active",
      isReturningUser: false,
      isLoading: false,
    };
  }

  // No subscription - determine if returning user or new user
  // A returning user has a budget (has actually used the app before).
  // We use hasBudget instead of onboardingCompletedAt because the current
  // auto-initialize flow (welcome endpoint) creates budgets without setting
  // onboardingCompletedAt, so that field is unreliable.
  const isReturningUser = hasBudget;

  return {
    isReadOnly: isReturningUser, // Only read-only if they had data before
    hasFullAccess: false,
    status: isReturningUser ? "expired" : "none",
    isReturningUser,
    isLoading: false,
  };
}
