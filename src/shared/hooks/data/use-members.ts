'use client';

import useSWR from 'swr';

interface Member {
  id: string;
  budgetId: string;
  userId?: string | null;
  name: string;
  type: 'owner' | 'partner' | 'child' | 'pet';
  color?: string | null;
  monthlyPleasureBudget?: number;
  createdAt?: string;
}

interface MembersResponse {
  members: Member[];
}

/**
 * Hook for fetching and caching members data
 * Uses SWR for automatic caching and deduplication
 */
export function useMembers() {
  const { data, error, isLoading, mutate } = useSWR<MembersResponse>(
    '/api/app/members'
  );

  return {
    members: data?.members ?? [],
    isLoading,
    error,
    mutate,
  };
}

export type { Member };
