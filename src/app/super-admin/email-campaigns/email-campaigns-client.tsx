"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Eye, Pencil } from "lucide-react";

interface CampaignRow {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultSubject: string;
  subjectOverride: string | null;
  effectiveSubject: string;
  updatedAt: string | null;
  stats: {
    total: number;
    sent: number;
    failed: number;
    lastSentAt: string | null;
  };
}

const LIST_URL = "/api/super-admin/email-campaigns";

export function EmailCampaignsClient() {
  const { data, error, isLoading } = useSWR<{ campaigns: CampaignRow[] }>(
    LIST_URL
  );

  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [editCampaign, setEditCampaign] = useState<CampaignRow | null>(null);

  async function toggleEnabled(key: string, enabled: boolean) {
    try {
      const res = await fetch(`${LIST_URL}/${key}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar");
      mutate(LIST_URL);
      toast.success(enabled ? "Campanha ativada" : "Campanha desativada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function saveSubjectOverride(key: string, subjectOverride: string | null) {
    try {
      const res = await fetch(`${LIST_URL}/${key}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subjectOverride }),
      });
      if (!res.ok) throw new Error("Falha ao salvar assunto");
      mutate(LIST_URL);
      toast.success("Assunto atualizado");
      setEditCampaign(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campanhas de e-mail</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ative ou desative o disparo automático de cada campanha, ajuste o
          assunto e pré-visualize o conteúdo que será enviado.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {error && (
        <p className="text-sm text-destructive">
          Erro ao carregar campanhas: {String(error)}
        </p>
      )}

      {data?.campaigns && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">Campanha</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="w-[120px]">Enviados</TableHead>
                <TableHead className="w-[160px]">Último envio</TableHead>
                <TableHead className="w-[100px]">Ativa</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.campaigns.map((c) => (
                <TableRow key={c.key}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {c.description}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    <div className="text-sm truncate" title={c.effectiveSubject}>
                      {c.effectiveSubject}
                    </div>
                    {c.subjectOverride ? (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        Customizado
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{c.stats.sent}</div>
                    {c.stats.failed > 0 && (
                      <div className="text-xs text-destructive">
                        {c.stats.failed} falha{c.stats.failed === 1 ? "" : "s"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.stats.lastSentAt
                      ? new Date(c.stats.lastSentAt).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.enabled}
                      onCheckedChange={(v) => toggleEnabled(c.key, v)}
                      aria-label={`Ativar ${c.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewKey(c.key)}
                      title="Pré-visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditCampaign(c)}
                      title="Editar assunto"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PreviewDialog
        campaignKey={previewKey}
        onClose={() => setPreviewKey(null)}
      />

      {editCampaign ? (
        <EditDialog
          key={editCampaign.key}
          campaign={editCampaign}
          onClose={() => setEditCampaign(null)}
          onSave={saveSubjectOverride}
        />
      ) : null}
    </div>
  );
}

function PreviewDialog({
  campaignKey,
  onClose,
}: {
  campaignKey: string | null;
  onClose: () => void;
}) {
  const open = campaignKey !== null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Pré-visualização</DialogTitle>
          <DialogDescription>
            Renderizado com dados de exemplo. Assunto e conteúdo finais podem
            variar dependendo do usuário.
          </DialogDescription>
        </DialogHeader>
        {campaignKey && (
          <iframe
            title="Pré-visualização do e-mail"
            src={`/api/super-admin/email-campaigns/${campaignKey}/preview`}
            className="flex-1 w-full border-t bg-white"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  campaign,
  onClose,
  onSave,
}: {
  campaign: CampaignRow;
  onClose: () => void;
  onSave: (key: string, subjectOverride: string | null) => Promise<void>;
}) {
  // Using a `key` prop at the call site remounts this dialog when the
  // target campaign changes, so this initial state stays fresh.
  const [subject, setSubject] = useState(campaign.subjectOverride ?? "");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar assunto</DialogTitle>
          <DialogDescription>
            Deixe em branco para voltar ao assunto padrão definido no código.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <div className="font-medium">{campaign.name}</div>
            <div className="text-muted-foreground text-xs mt-1">
              Padrão: <span className="font-mono">{campaign.defaultSubject}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-override">Assunto customizado</Label>
            <Input
              id="subject-override"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={campaign.defaultSubject}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Máx. 200 caracteres.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onSave(
                campaign.key,
                subject.trim().length ? subject.trim() : null
              )
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
