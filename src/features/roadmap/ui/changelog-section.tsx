"use client";

import useSWR from "swr";
import { CheckCircle2, Rocket } from "lucide-react";
import type { RoadmapCategory } from "@/db/schema/roadmap";
import { CATEGORY_LABELS } from "../types";

interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory | null;
  source: "admin" | "user";
  implementedAt: string;
  adminNotes: string | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ChangelogSection() {
  const { data, isLoading } = useSWR<{ entries: ChangelogEntry[] }>(
    "/api/app/roadmap/changelog"
  );
  const entries = data?.entries ?? [];

  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Carregando histórico...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Rocket className="size-5 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Ainda não entregamos nada do roadmap. Fique de olho!
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      <ul className="space-y-4">
        {entries.map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[18px] top-1 flex size-5 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-background">
              <CheckCircle2 className="size-3 text-emerald-600" />
            </span>
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <span className="text-xs font-medium text-emerald-600">
                  {formatDate(entry.implementedAt)}
                </span>
                {entry.category && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                )}
                {entry.source === "user" && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                    Sugerido pela comunidade
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-sm">{entry.title}</h4>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {entry.description}
              </p>
              {entry.adminNotes && (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  {entry.adminNotes}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
