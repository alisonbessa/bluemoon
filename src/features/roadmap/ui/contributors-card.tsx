"use client";

import useSWR from "swr";
import { Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";

interface Contributor {
  userId: string;
  name: string | null;
  image: string | null;
  suggestions: number;
  implemented: number;
  totalUpvotes: number;
}

export function ContributorsCard() {
  const { data } = useSWR<{ contributors: Contributor[] }>(
    "/api/app/roadmap/contributors"
  );
  const list = data?.contributors ?? [];
  if (list.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="size-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Top betas colaboradores</h3>
      </div>
      <ul className="space-y-2">
        {list.slice(0, 5).map((c, idx) => (
          <li key={c.userId} className="flex items-center gap-3">
            <span className="w-5 text-sm font-bold text-muted-foreground tabular-nums">
              {idx + 1}
            </span>
            <Avatar className="size-7">
              {c.image && <AvatarImage src={c.image} />}
              <AvatarFallback className="text-[11px]">
                {(c.name ?? "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {c.name ?? "Beta"}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.implemented} entregue{c.implemented === 1 ? "" : "s"} ·{" "}
                {c.suggestions} sugest{c.suggestions === 1 ? "ão" : "ões"}
              </div>
            </div>
            <span className="text-xs font-semibold text-primary tabular-nums">
              {c.totalUpvotes} ▲
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
