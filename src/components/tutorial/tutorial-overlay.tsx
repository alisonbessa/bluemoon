"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTutorial } from "./tutorial-provider";
import { TutorialTooltip } from "./tutorial-tooltip";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialOverlay() {
  const { isVisible, currentStep } = useTutorial();
  const [mounted, setMounted] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  const updateSpotlight = useCallback(() => {
    if (!currentStep?.targetSelector) {
      setSpotlightRect(null);
      return;
    }

    const element = document.querySelector(currentStep.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const padding = 8;
      setSpotlightRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep?.targetSelector]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Initial update
    updateSpotlight();

    // Update on resize/scroll
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    // MutationObserver to handle dynamic content
    const observer = new MutationObserver(updateSpotlight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
      observer.disconnect();
    };
  }, [isVisible, updateSpotlight]);

  if (!mounted || !isVisible) return null;

  const overlayContent = (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      aria-hidden="true"
    >
      {/* Overlay with spotlight cutout */}
      {spotlightRect ? (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      ) : (
        <div
          className="absolute inset-0 bg-black/70 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Spotlight border glow */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none animate-pulse"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      )}

      {/* Tooltip */}
      <TutorialTooltip spotlightRect={spotlightRect} />
    </div>
  );

  return createPortal(overlayContent, document.body);
}
