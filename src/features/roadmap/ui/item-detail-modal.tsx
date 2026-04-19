"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { FormModalWrapper } from "@/shared/molecules/form-modal-wrapper";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "./status-badge";
import { VoteButton } from "./vote-button";
import { CommentItem } from "./comment-item";
import type { RoadmapComment, RoadmapItem } from "../types";
import { CATEGORY_LABELS, STATUS_DESCRIPTIONS } from "../types";

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ItemDetailModalProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoteChange: (id: string, upvotes: number, hasVoted: boolean) => void;
  onRedirect?: (targetId: string) => void;
}

interface DetailResponse {
  item?: RoadmapItem;
  mergedInto?: string;
}

export function ItemDetailModal({
  itemId,
  open,
  onOpenChange,
  onVoteChange,
  onRedirect,
}: ItemDetailModalProps) {
  const { data, mutate } = useSWR<DetailResponse>(
    itemId && open ? `/api/app/roadmap/${itemId}` : null
  );
  const { data: commentsData, mutate: mutateComments } = useSWR<{
    comments: RoadmapComment[];
  }>(itemId && open && data?.item ? `/api/app/roadmap/${itemId}/comments` : null);

  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

  const item = data?.item;
  const comments = commentsData?.comments ?? [];

  // Follow merge redirects transparently
  useEffect(() => {
    if (data?.mergedInto && onRedirect) onRedirect(data.mergedInto);
  }, [data?.mergedInto, onRedirect]);

  const handleSubmit = async () => {
    if (!itemId || content.trim().length < 2) {
      toast.error("Escreva ao menos 2 caracteres");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/app/roadmap/${itemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isAnonymous: anonymous }),
      });
      const result = await res.json();
      if (!res.ok) {
        if (res.status === 422 && result?.error === "moderation_rejected") {
          toast.error(result.reason ?? "Conteúdo impróprio detectado.");
          return;
        }
        if (res.status === 429 && result?.error === "rate_limited") {
          toast.error(result.reason ?? "Limite de comentários atingido");
          return;
        }
        toast.error(result?.error || "Falha ao comentar");
        return;
      }
      setContent("");
      setAnonymous(false);
      await mutateComments();
      await mutate();
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/app/roadmap?"),
        undefined,
        { revalidate: true }
      );
      toast.success("Comentário enviado");
    } finally {
      setSending(false);
    }
  };

  return (
    <FormModalWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={item?.title ?? "Carregando..."}
      size="lg"
      footer="none"
    >
      {!item ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <VoteButton
              itemId={item.id}
              upvotes={item.upvotes}
              hasVoted={item.hasVoted}
              status={item.status}
              onChange={(u, v) => {
                onVoteChange(item.id, u, v);
                mutate();
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusBadge status={item.status} />
                {item.category && (
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    {CATEGORY_LABELS[item.category]}
                  </span>
                )}
                {item.source === "admin" && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Oficial
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {STATUS_DESCRIPTIONS[item.status]} · criado em{" "}
                {formatDate(item.createdAt)}
                {item.author && ` · por ${item.author.name ?? "Usuário"}`}
                {item.source === "user" && !item.author && " · anônimo"}
              </p>
              <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                {item.description}
              </div>
              {item.adminNotes && (
                <div className="mt-3 rounded-lg border-l-4 border-primary bg-primary/5 p-3 text-sm">
                  <div className="text-xs font-semibold uppercase text-primary mb-1">
                    Nota da equipe
                  </div>
                  {item.adminNotes}
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="size-4 text-muted-foreground" />
              <h4 className="font-semibold text-sm">
                Comentários ({comments.length})
              </h4>
            </div>

            <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Seja o primeiro a comentar
                </p>
              ) : (
                comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    onVoteChange={(commentId, upvotes, hasVoted) => {
                      mutateComments(
                        (prev) =>
                          prev
                            ? {
                                comments: prev.comments.map((pc) =>
                                  pc.id === commentId
                                    ? { ...pc, upvotes, hasVoted }
                                    : pc
                                ),
                              }
                            : prev,
                        false
                      );
                    }}
                  />
                ))
              )}
            </div>

            <div className="mt-4 space-y-2">
              <Textarea
                placeholder="Escreva um comentário..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={1000}
                disabled={sending}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="comment-anon"
                    checked={anonymous}
                    onCheckedChange={setAnonymous}
                    disabled={sending}
                  />
                  <Label htmlFor="comment-anon" className="text-xs text-muted-foreground">
                    Comentar anonimamente
                  </Label>
                </div>
                <Button size="sm" onClick={handleSubmit} disabled={sending}>
                  {sending ? "Enviando..." : "Comentar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FormModalWrapper>
  );
}
