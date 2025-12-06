"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Copy,
  Check,
  Loader2,
  Clock,
  Share2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

interface InviteMemberModalProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteCreated?: () => void;
}

export function InviteMemberModal({
  budgetId,
  open,
  onOpenChange,
  onInviteCreated,
}: InviteMemberModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");

  const handleCreateInvite = async () => {
    if (!name.trim()) {
      toast.error("Digite o nome da pessoa");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/app/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId,
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar convite");
      }

      setInviteLink(data.inviteLink);
      toast.success("Convite criado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar convite");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Convite para orçamento compartilhado",
          text: `Você foi convidado para compartilhar um orçamento!`,
          url: inviteLink,
        });
      } catch (error) {
        // User cancelled or error
        if ((error as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleClose = () => {
    setInviteLink(null);
    setName("");
    setCopied(false);
    onOpenChange(false);
    if (inviteLink) {
      onInviteCreated?.();
    }
  };

  const handleCreateAnother = () => {
    setInviteLink(null);
    setName("");
    setCopied(false);
    onInviteCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Parceiro</DialogTitle>
          <DialogDescription>
            Adicione um parceiro para compartilhar o orçamento
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do parceiro *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Maria, João..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    handleCreateInvite();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Digite o nome de quem vai receber o convite
              </p>
            </div>

            <Button
              onClick={handleCreateInvite}
              disabled={isCreating || !name.trim()}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando convite...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Gerar Convite
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Convite para <strong>{name}</strong> criado! O link expira em 7 dias.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyLink}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
              <Button
                className="flex-1"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={handleCreateAnother}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar outra pessoa
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
