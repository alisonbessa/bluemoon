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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Link as LinkIcon,
  Mail,
  Copy,
  Check,
  Loader2,
  Clock,
  Share2,
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
  const [activeTab, setActiveTab] = useState<"link" | "email">("link");
  const [isCreating, setIsCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleCreateLinkInvite = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/app/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar convite");
      }

      setInviteLink(data.inviteLink);
      toast.success("Link de convite criado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar convite");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateEmailInvite = async () => {
    if (!email) {
      toast.error("Digite o email do convidado");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/app/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId,
          email,
          name: name || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar convite");
      }

      toast.success("Convite enviado!");
      setEmail("");
      setName("");
      onInviteCreated?.();
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
          text: "Você foi convidado para compartilhar um orçamento!",
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
    setEmail("");
    setName("");
    setCopied(false);
    onOpenChange(false);
    if (inviteLink) {
      onInviteCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>
            Convide alguém para compartilhar o orçamento com você
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "link" | "email")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            {!inviteLink ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Gere um link de convite que pode ser compartilhado com qualquer pessoa.
                  O link expira em 7 dias.
                </p>
                <Button
                  onClick={handleCreateLinkInvite}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Gerar Link de Convite
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Este link expira em 7 dias. Qualquer pessoa com o link pode aceitar o convite.
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
                    Copiar Link
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
                  onClick={handleCreateLinkInvite}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                  )}
                  Gerar Novo Link
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Envie um convite diretamente para o email da pessoa.
              O convite expira em 7 dias.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="parceiro@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome (opcional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Nome do convidado"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <Button
                onClick={handleCreateEmailInvite}
                disabled={isCreating || !email}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
