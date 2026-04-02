'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect and manage setup mode (?setup=true).
 * When active, pages can show contextual tutorials/tips.
 * Automatically cleans up the query param after dismissal.
 */
export function useSetupMode() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isSetupMode, setIsSetupMode] = useState(false);

  useEffect(() => {
    setIsSetupMode(searchParams?.get('setup') === 'true');
  }, [searchParams]);

  const dismissSetup = useCallback(() => {
    setIsSetupMode(false);
    // Clean up the query param without navigation
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('setup');
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  return { isSetupMode, dismissSetup };
}
