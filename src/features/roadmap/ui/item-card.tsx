"use client";

import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { StatusBadge } from "./status-badge";
import { VoteButton } from "./vote-button";
import type { RoadmapItem } from "../types";

interface ItemCardProps {
  item: RoadmapItem;
  onClick: () => void;
  onVoteChange: (id: string, upvotes: number, hasVoted: boolean) => void;
}

export function ItemCard({ item, onClick, onVoteChange }: ItemCardProps) {
  return (
    <div
      className="group flex gap-3 rounded-lg border bg-card p-4 hover:border-primary/40 hover:bg-accent/30 transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <VoteButton
          itemId={item.id}
          upvotes={item.upvotes}
          hasVoted={item.hasVoted}
          status={item.status}
          onChange={(u, v) => onVoteChange(item.id, u, v)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <StatusBadge status={item.status} />
          {item.category && (
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
              {item.category}
            </span>
          )}
          {item.source === "admin" && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Oficial
            </span>
          )}
        </div>

        <h3 className="font-semibold leading-tight text-sm sm:text-base truncate">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {item.description}
        </p>

        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          {item.author ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="size-5">
                {item.author.image && <AvatarImage src={item.author.image} />}
                <AvatarFallback className="text-[10px]">
                  {(item.author.name ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{item.author.name ?? "Usuário"}</span>
            </div>
          ) : item.source === "user" ? (
            <span className="italic">Anônimo</span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" />
            {item.commentsCount}
          </span>
        </div>
      </div>
    </div>
  );
}
