"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { FlaskConical, History, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { PageContent } from "@/shared/molecules/page-content";
import { EmptyState } from "@/shared/molecules/empty-state";
import {
  ROADMAP_CATEGORIES,
  ROADMAP_STATUSES,
  type RoadmapCategory,
  type RoadmapStatus,
} from "@/db/schema/roadmap";
import type { RoadmapItem } from "../types";
import { CATEGORY_LABELS, STATUS_LABELS } from "../types";
import { ItemCard } from "./item-card";
import { ItemDetailModal } from "./item-detail-modal";
import { SubmitRequestModal } from "./submit-request-modal";
import { ChangelogSection } from "./changelog-section";
import { ContributorsCard } from "./contributors-card";

type Tab = "roadmap" | "requests" | "changelog";

export function BetaLabClient() {
  const [tab, setTab] = useState<Tab>("roadmap");
  const [status, setStatus] = useState<RoadmapStatus | "all">("all");
  const [category, setCategory] = useState<RoadmapCategory | "all">("all");
  const [sort, setSort] = useState<"votes" | "newest">("votes");
  const [search, setSearch] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Mark roadmap as seen on mount (and refresh sidebar badge)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/app/roadmap/seen", { method: "POST" })
      .then(() => {
        if (!cancelled) {
          import("swr").then(({ mutate }) =>
            mutate("/api/app/roadmap/seen")
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams({ sort });
    if (tab !== "changelog") p.set("tab", tab);
    if (status !== "all") p.set("status", status);
    if (category !== "all") p.set("category", category);
    if (search) p.set("search", search);
    return p.toString();
  }, [tab, status, category, sort, search]);

  const listKey = tab === "changelog" ? null : `/api/app/roadmap?${query}`;
  const { data, isLoading, mutate } = useSWR<{ items: RoadmapItem[] }>(listKey);

  const items = data?.items ?? [];

  const patchItem = (id: string, upvotes: number, hasVoted: boolean) => {
    if (!data) return;
    mutate(
      {
        items: data.items.map((i) =>
          i.id === id ? { ...i, upvotes, hasVoted } : i
        ),
      },
      false
    );
  };

  const openItem = (id: string) => setDetailId(id);

  return (
    <PageContent>
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FlaskConical className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Laboratório Beta
              </h1>
              <span className="rounded-full bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
                Beta
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Você tem acesso antecipado. Acompanhe o que vem por aí e ajude a priorizar as
              próximas features do produto.
            </p>
          </div>
          <Button onClick={() => setSubmitOpen(true)} className="w-full sm:w-auto">
            <Plus className="size-4" />
            Sugerir melhoria
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 lg:gap-6">
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <TabsList className="self-start">
                <TabsTrigger value="roadmap">
                  <Sparkles className="size-3.5" />
                  Roadmap
                </TabsTrigger>
                <TabsTrigger value="requests">Feature Requests</TabsTrigger>
                <TabsTrigger value="changelog">
                  <History className="size-3.5" />
                  Changelog
                </TabsTrigger>
              </TabsList>

              {tab !== "changelog" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-44">
                    <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-8 h-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as RoadmapCategory | "all")}
                  >
                    <SelectTrigger className="w-full sm:w-40 h-9">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {ROADMAP_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as RoadmapStatus | "all")}
                  >
                    <SelectTrigger className="w-full sm:w-40 h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      {ROADMAP_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sort} onValueChange={(v) => setSort(v as "votes" | "newest")}>
                    <SelectTrigger className="w-full sm:w-36 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="votes">Mais votados</SelectItem>
                      <SelectItem value="newest">Mais recentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <TabsContent value="roadmap" className="mt-4">
              <ListSection
                items={items}
                isLoading={isLoading}
                emptyTitle="Nada por aqui ainda"
                emptyDescription="A equipe ainda não publicou itens de roadmap. Enquanto isso, envie suas ideias na aba Feature Requests."
                onItemClick={openItem}
                onVoteChange={patchItem}
              />
            </TabsContent>
            <TabsContent value="requests" className="mt-4">
              <ListSection
                items={items}
                isLoading={isLoading}
                emptyTitle="Nenhuma sugestão ainda"
                emptyDescription="Seja o primeiro a sugerir uma melhoria. Outros betas poderão votar na sua ideia."
                actionLabel="Sugerir melhoria"
                onAction={() => setSubmitOpen(true)}
                onItemClick={openItem}
                onVoteChange={patchItem}
              />
            </TabsContent>
            <TabsContent value="changelog" className="mt-4">
              <ChangelogSection />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <ContributorsCard />
        </aside>
      </div>

      <SubmitRequestModal
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        onCreated={() => mutate()}
        onOpenItem={(id) => {
          setTab("requests");
          setDetailId(id);
        }}
      />
      <ItemDetailModal
        itemId={detailId}
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
        onVoteChange={patchItem}
      />
    </PageContent>
  );
}

function ListSection({
  items,
  isLoading,
  emptyTitle,
  emptyDescription,
  actionLabel,
  onAction,
  onItemClick,
  onVoteChange,
}: {
  items: RoadmapItem[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  actionLabel?: string;
  onAction?: () => void;
  onItemClick: (id: string) => void;
  onVoteChange: (id: string, upvotes: number, hasVoted: boolean) => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FlaskConical className="size-5 text-muted-foreground" />}
        title={emptyTitle}
        description={emptyDescription}
        action={
          actionLabel && onAction
            ? { label: actionLabel, onClick: onAction, icon: <Plus className="size-3.5" /> }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item.id)}
          onVoteChange={onVoteChange}
        />
      ))}
    </div>
  );
}
