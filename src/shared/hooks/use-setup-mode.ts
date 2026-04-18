'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTutorial } from '@/shared/tutorial/tutorial-provider';

/**
 * Hook to detect and manage setup mode (?setup=true).
 * When active, automatically starts a page-specific spotlight tour.
 * Automatically cleans up the query param after dismissal.
 */
export function useSetupMode() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isSetupMode, setIsSetupMode] = useState(false);
  const { startPageTutorial, isActive, isVisible } = useTutorial();
  const tourTriggered = useRef(false);

  useEffect(() => {
    const isSetup = searchParams?.get('setup') === 'true';
    setIsSetupMode(isSetup);

    // Auto-start page spotlight tour when arriving via checklist link.
    // Strip ?setup=true from the URL right after firing so that any later
    // remount (Strict Mode, HMR, SPA navigation back to this route) does NOT
    // re-trigger the tour.
    if (isSetup && pathname && !tourTriggered.current && !isActive) {
      tourTriggered.current = true;
      const timer = setTimeout(() => {
        startPageTutorial(pathname);

        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.delete('setup');
        const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
        router.replace(newUrl, { scroll: false });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname, startPageTutorial, isActive, router]);

  // Reset trigger flag when pathname changes
  useEffect(() => {
    tourTriggered.current = false;
  }, [pathname]);

  const dismissSetup = useCallback(() => {
    setIsSetupMode(false);
    // Clean up the query param without navigation
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('setup');
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Hide the setup tip banner when the spotlight tour is showing
  const showSetupTip = isSetupMode && !isVisible;

  return { isSetupMode: showSetupTip, dismissSetup };
}
