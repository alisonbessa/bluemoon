"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTutorial } from "./tutorial-provider";
import { TutorialTooltip } from "./tutorial-tooltip";

export function TutorialOverlay() {
  const { isActive, currentStep } = useTutorial();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive || !currentStep?.target) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const element = document.querySelector(currentStep.target!);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    // Initial update
    updateTargetRect();

    // Update on scroll/resize
    window.addEventListener("scroll", updateTargetRect, true);
    window.addEventListener("resize", updateTargetRect);

    // Use MutationObserver to detect when target element appears
    const observer = new MutationObserver(updateTargetRect);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", updateTargetRect, true);
      window.removeEventListener("resize", updateTargetRect);
      observer.disconnect();
    };
  }, [isActive, currentStep]);

  if (!mounted || !isActive) return null;

  const isCentered = currentStep?.placement === "center" || !currentStep?.target;
  const padding = 8;

  const overlayContent = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      aria-hidden="true"
    >
      {/* Dark overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ pointerEvents: isCentered ? "auto" : "auto" }}
      >
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !isCentered && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* Spotlight border/glow around target */}
      {targetRect && !isCentered && (
        <div
          className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_4px_rgba(var(--primary),0.3)] transition-all duration-200 pointer-events-none"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
        />
      )}

      {/* Tooltip */}
      <TutorialTooltip targetRect={targetRect} />
    </div>
  );

  return createPortal(overlayContent, document.body);
}
