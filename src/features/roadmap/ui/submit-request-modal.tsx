"use client";

import { useState } from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { FormModalWrapper } from "@/shared/molecules/form-modal-wrapper";
import { AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  ROADMAP_CATEGORIES,
  type RoadmapCategory,
} from "@/db/schema/roadmap";
import type { RoadmapItem, SimilarityMatchItem } from "../types";
import { CATEGORY_LABELS } from "../types";
import { StatusBadge } from "./status-badge";

interface SubmitRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (item: RoadmapItem) => void;
  onOpenItem: (id: string) => void;
}

export function SubmitRequestModal({
  open,
  onOpenChange,
  onCreated,
  onOpenItem,
}: SubmitRequestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RoadmapCategory | "">("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matches, setMatches] = useState<SimilarityMatchItem[] | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setIsAnonymous(false);
    setMatches(null);
    setModerationError(null);
  };

  const handleSubmit = async (skipSimilarity = false) => {
    setModerationError(null);
    if (title.trim().length < 4) {
      toast.error("Título precisa ter ao menos 4 caracteres");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Descrição precisa ter ao menos 10 caracteres");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/app/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category: category || undefined,
          isAnonymous,
          skipSimilarity,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data?.error === "moderation_rejected") {
          setModerationError(data.reason ?? "Conteúdo impróprio detectado.");
          return;
        }
        if (res.status === 429 && data?.error === "rate_limited") {
          toast.error(data.reason ?? "Limite de sugestões atingido");
          return;
        }
        toast.error(data?.error || "Falha ao enviar sugestão");
        return;
      }

      if (data.similarFound) {
        setMatches(data.matches ?? []);
        return;
      }

      toast.success("Sugestão enviada!");
      onCreated(data.item);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  return (
    <FormModalWrapper
      open={open}
      onOpenChange={handleClose}
      title="Sugerir melhoria"
      description="Descreva uma ideia para o produto. Nosso assistente verifica se ela já existe e ajuda a refinar o texto."
      footer="none"
      size="lg"
    >
      {matches ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2 text-sm">
            <Sparkles className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <div className="font-medium">
                Encontramos {matches.length} sugestão(ões) parecida(s)
              </div>
              <p className="text-muted-foreground mt-0.5">
                Veja se alguma delas atende ao seu pedido. Se sim, vote ou comente no item
                existente. Caso nenhuma se encaixe, você pode enviar mesmo assim.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {matches.map((m) =>
              m.item ? (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onOpenItem(m.id);
                    reset();
                    onOpenChange(false);
                  }}
                  className="w-full text-left rounded-lg border p-3 hover:border-primary/40 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={m.item.status} />
                    <span className="text-xs text-muted-foreground">
                      {m.item.upvotes} votos
                    </span>
                    <span className="ml-auto text-xs text-primary font-medium">
                      {Math.round(m.score * 100)}% similar
                    </span>
                  </div>
                  <div className="font-medium text-sm">{m.item.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">{m.reason}</p>
                </button>
              ) : null
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setMatches(null)}>
              Editar texto
            </Button>
            <Button
              variant="default"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
            >
              Enviar mesmo assim
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {moderationError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex gap-2 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" />
              <div>
                <div className="font-medium text-destructive">
                  Não foi possível enviar
                </div>
                <p className="text-muted-foreground mt-0.5">{moderationError}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="roadmap-title">Título</Label>
            <Input
              id="roadmap-title"
              placeholder="Ex.: Exportar relatório em PDF"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roadmap-category">Categoria</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as RoadmapCategory)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="roadmap-category">
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {ROADMAP_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roadmap-description">Descrição</Label>
            <Textarea
              id="roadmap-description"
              placeholder="Conte o problema que você quer resolver e como imagina a solução"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={6}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/2000 · a IA verifica apenas conteúdo impróprio antes de publicar
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="roadmap-anon" className="text-sm font-medium">
                Enviar como anônimo
              </Label>
              <p className="text-xs text-muted-foreground">
                Se desmarcado, a equipe pode entrar em contato para mais detalhes.
              </p>
            </div>
            <Switch
              id="roadmap-anon"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
              {isSubmitting ? "Analisando..." : "Enviar sugestão"}
            </Button>
          </div>
        </div>
      )}
    </FormModalWrapper>
  );
}
