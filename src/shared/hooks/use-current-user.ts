'use client';

import useSWR from 'swr';
import type { MeResponse } from '@/app/api/app/me/types';

/**
 * Main hook for current user data
 * Fetches user, plan, and credits in a single request
 * All other user-related hooks should derive from this one
 */
export function useCurrentUser() {
  const { data, isLoading, error, mutate } = useSWR<MeResponse>('/api/app/me');

  return {
    user: data?.user,
    currentPlan: data?.currentPlan,
    credits: data?.user?.credits,
    hasPartnerAccess: data?.hasPartnerAccess ?? false,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook for user data only
 * Uses useCurrentUser internally to share the SWR cache
 */
export function useUser() {
  const { user, hasPartnerAccess, isLoading, error, mutate } = useCurrentUser();
  return { user, hasPartnerAccess, isLoading, error, mutate };
}

/**
 * Hook for current plan data only
 * Uses useCurrentUser internally to share the SWR cache
 */
export function useCurrentPlan() {
  const { currentPlan, isLoading, error, mutate } = useCurrentUser();
  return { currentPlan, isLoading, error, mutate };
}

/**
 * Hook for credits data only
 * Uses useCurrentUser internally to share the SWR cache
 */
export function useCredits() {
  const { credits, isLoading, error, mutate } = useCurrentUser();
  return { credits, isLoading, error, mutate };
}

// Default export for backward compatibility
export default useUser;
