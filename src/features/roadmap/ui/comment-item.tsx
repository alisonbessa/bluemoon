"use client";

import { useState } from "react";
import { ChevronUp, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib/utils";
import type { RoadmapComment } from "../types";

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface CommentItemProps {
  comment: RoadmapComment;
  onVoteChange: (commentId: string, upvotes: number, hasVoted: boolean) => void;
}

export function CommentItem({ comment, onVoteChange }: CommentItemProps) {
  const [busy, setBusy] = useState(false);

  const toggleVote = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/app/roadmap/comments/${comment.id}/vote`, {
        method: comment.hasVoted ? "DELETE" : "POST",
      });
      if (res.ok) {
        const data = await res.json();
        onVoteChange(
          comment.id,
          data.upvotes ?? comment.upvotes,
          data.hasVoted ?? !comment.hasVoted
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg p-2",
        comment.isTeam && "border-l-2 border-primary bg-primary/5"
      )}
    >
      <Avatar className="size-7 shrink-0">
        {comment.author?.image && <AvatarImage src={comment.author.image} />}
        <AvatarFallback className="text-[10px]">
          {comment.author
            ? (comment.author.name ?? "?").slice(0, 1).toUpperCase()
            : "A"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline flex-wrap gap-2">
          <span className="text-sm font-medium">
            {comment.author?.name ?? "Anônimo"}
          </span>
          {comment.isTeam && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wide">
              <Shield className="size-2.5" />
              Equipe
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatDate(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        <button
          type="button"
          onClick={toggleVote}
          disabled={busy}
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors",
            comment.hasVoted
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
          aria-label={comment.hasVoted ? "Remover voto" : "Votar"}
        >
          <ChevronUp
            className={cn("size-3", comment.hasVoted && "fill-current")}
          />
          <span className="tabular-nums">{comment.upvotes}</span>
        </button>
      </div>
    </div>
  );
}
