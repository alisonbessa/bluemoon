"use client";

import { ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useState } from "react";
import type { RoadmapStatus } from "@/db/schema/roadmap";

interface VoteButtonProps {
  itemId: string;
  upvotes: number;
  hasVoted: boolean;
  status: RoadmapStatus;
  onChange: (upvotes: number, hasVoted: boolean) => void;
}

export function VoteButton({ itemId, upvotes, hasVoted, status, onChange }: VoteButtonProps) {
  const [busy, setBusy] = useState(false);
  const disabled = status !== "voting";

  const toggle = async () => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/app/roadmap/${itemId}/vote`, {
        method: hasVoted ? "DELETE" : "POST",
      });
      if (res.ok) {
        const data = await res.json();
        onChange(data.upvotes ?? upvotes, data.hasVoted ?? !hasVoted);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || busy}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 min-w-[52px] transition-colors",
        hasVoted
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted",
        disabled && "opacity-60 cursor-not-allowed"
      )}
      aria-label={hasVoted ? "Remover voto" : "Votar"}
      title={disabled ? "Votação encerrada" : hasVoted ? "Remover voto" : "Votar"}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ChevronUp className={cn("size-4", hasVoted && "fill-current")} />
      )}
      <span className="text-xs font-semibold tabular-nums">{upvotes}</span>
    </button>
  );
}
