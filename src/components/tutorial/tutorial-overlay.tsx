"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTutorial } from "./tutorial-provider";
import { TutorialTooltip } from "./tutorial-tooltip";

export function TutorialOverlay() {
  const { isActive } = useTutorial();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isActive) return null;

  const overlayContent = (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      aria-hidden="true"
    >
      {/* Semi-transparent dark overlay */}
      <div
        className="absolute inset-0 bg-black/60 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Tooltip */}
      <TutorialTooltip />
    </div>
  );

  return createPortal(overlayContent, document.body);
}
