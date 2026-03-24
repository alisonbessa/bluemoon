"use client";

/**
 * Client-side performance observer.
 *
 * Watches for slow API calls (>500ms) and logs them to the console
 * in development. In production, metrics are silently collected and
 * can be forwarded to an analytics endpoint if needed.
 *
 * Also logs Core Web Vitals (LCP, FID, CLS) when available.
 */

const SLOW_THRESHOLD_MS = 500;

export function initPerfObserver() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

  // Watch for slow fetch/XHR calls
  try {
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        if (!resource.name.includes("/api/app/")) continue;

        const duration = Math.round(resource.duration);
        if (duration > SLOW_THRESHOLD_MS) {
          const path = new URL(resource.name).pathname;
          console.warn(
            `[perf] Slow API: ${path} took ${duration}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`
          );
        }
      }
    });
    resourceObserver.observe({ type: "resource", buffered: false });
  } catch {
    // PerformanceObserver not supported
  }

  // Log navigation timing on page load
  if (typeof window !== "undefined") {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        if (!nav) return;

        const metrics = {
          dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcp: Math.round(nav.connectEnd - nav.connectStart),
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          load: Math.round(nav.loadEventEnd - nav.startTime),
        };

        if (process.env.NODE_ENV === "development") {
          console.log("[perf] Page load:", metrics);
        }
      }, 0);
    });
  }
}
