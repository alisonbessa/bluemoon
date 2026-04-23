"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Megaphone,
  Eye,
  Send,
  EyeOff,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { FormModalWrapper } from "@/shared/molecules/form-modal-wrapper";
import { AnnouncementModal } from "@/features/announcements/ui/announcement-modal";

interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

export default function AdminAnnouncementsPage() {
  const [editItem, setEditItem] = useState<AdminAnnouncement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const swrKey = "/api/super-admin/announcements";
  const { data, isLoading, mutate } = useSWR<{ items: AdminAnnouncement[] }>(swrKey);
  const items = data?.items ?? [];

  const refreshUserSide = () =>
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/app/announcements"),
      undefined,
      { revalidate: true }
    );

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/super-admin/announcements/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Aviso excluído");
      mutate();
      refreshUserSide();
    } else {
      toast.error("Falha ao excluir");
    }
  };

  const handleTogglePublish = async (item: AdminAnnouncement) => {
    const next = !item.publishedAt;
    const res = await fetch(`/api/super-admin/announcements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish: next }),
    });
    if (!res.ok) {
      toast.error("Falha ao atualizar");
      return;
    }
    toast.success(next ? "Aviso publicado" : "Aviso despublicado");
    await mutate();
    refreshUserSide();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="size-5 text-primary" />
          <h1 className="text-2xl font-bold">Avisos</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo aviso
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Apenas o aviso mais recente publicado é exibido aos usuários, em modal,
        uma única vez por usuário.
      </p>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publicado em</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum aviso cadastrado
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[320px] truncate font-medium">
                    {item.title}
                  </TableCell>
                  <TableCell>
                    {item.publishedAt ? (
                      <span className="text-xs uppercase tracking-wide text-green-600 dark:text-green-400">
                        Publicado
                      </span>
                    ) : (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Rascunho
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(item.publishedAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditItem(item)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title={item.publishedAt ? "Despublicar" : "Publicar"}
                        onClick={() => handleTogglePublish(item)}
                      >
                        {item.publishedAt ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir aviso</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é irreversível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOrEditModal
        item={null}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          mutate();
          refreshUserSide();
        }}
      />

      <CreateOrEditModal
        item={editItem}
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSaved={() => {
          mutate();
          refreshUserSide();
        }}
      />
    </div>
  );
}

function CreateOrEditModal({
  item,
  open,
  onClose,
  onSaved,
}: {
  item: AdminAnnouncement | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(item?.title ?? "");
      setBody(item?.body ?? "");
      setCtaLabel(item?.ctaLabel ?? "");
      setCtaUrl(item?.ctaUrl ?? "");
      setPublish(false);
    }
  }, [open, item]);

  const submit = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        body,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
      };
      if (!isEdit) payload.publish = publish;
      else if (publish) payload.publish = true;

      const url = isEdit
        ? `/api/super-admin/announcements/${item!.id}`
        : `/api/super-admin/announcements`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Falha ao salvar");
        return;
      }
      toast.success(isEdit ? "Aviso atualizado" : "Aviso criado");
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const canPreview = title.length >= 2 && body.length >= 2;

  return (
    <>
      <FormModalWrapper
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title={isEdit ? "Editar aviso" : "Novo aviso"}
        description="Use o botão Visualizar para testar o modal antes de publicar."
        isSubmitting={busy}
        onSubmit={submit}
        submitLabel={isEdit ? "Salvar" : publish ? "Criar e publicar" : "Salvar rascunho"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Ex: Novidade — relatórios mensais"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Corpo (markdown)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={8000}
              placeholder="Use markdown: **negrito**, [links](https://...), listas, etc."
              className="font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Texto do botão (opcional)</Label>
              <Input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                maxLength={60}
                placeholder="Ex: Ver novidade"
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL do botão (opcional)</Label>
              <Input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                maxLength={500}
                placeholder="https://... ou /app/..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={!canPreview}
            >
              <Eye className="size-4" />
              Visualizar como usuário
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="size-4"
              />
              {isEdit
                ? "Republicar agora (reseta para todos)"
                : "Publicar imediatamente"}
            </label>
          </div>
        </div>
      </FormModalWrapper>

      {canPreview && (
        <AnnouncementModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          announcement={{
            title,
            body,
            ctaLabel: ctaLabel || null,
            ctaUrl: ctaUrl || null,
          }}
        />
      )}
    </>
  );
}
