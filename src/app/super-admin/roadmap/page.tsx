"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  ArrowUpCircle,
  MessageCircle,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
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
import { ROADMAP_STATUSES, type RoadmapStatus } from "@/db/schema/roadmap";
import { STATUS_LABELS } from "@/features/roadmap/types";
import { StatusBadge } from "@/features/roadmap/ui/status-badge";

interface AdminItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  source: "admin" | "user";
  category: string | null;
  upvotes: number;
  commentsCount: number;
  isAnonymous: boolean;
  adminNotes: string | null;
  createdAt: string;
  implementedAt: string | null;
  authorId: string | null;
  authorName: string | null;
  authorEmail: string | null;
}

const SOURCE_OPTIONS = [
  { value: "all", label: "Todas as fontes" },
  { value: "admin", label: "Roadmap oficial" },
  { value: "user", label: "Sugestões" },
];

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("pt-BR");
}

export default function AdminRoadmapPage() {
  const [source, setSource] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<AdminItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const params = new URLSearchParams();
  if (source !== "all") params.set("source", source);
  if (status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  const swrKey = `/api/super-admin/roadmap?${params.toString()}`;

  const { data, isLoading, mutate } = useSWR<{ items: AdminItem[] }>(swrKey);
  const items = data?.items ?? [];

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/super-admin/roadmap/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Item excluído");
      mutate();
    } else {
      toast.error("Falha ao excluir");
    }
  };

  const handlePatch = async (
    id: string,
    patch: Partial<Pick<AdminItem, "status" | "title" | "description" | "category" | "adminNotes">>
  ) => {
    const res = await fetch(`/api/super-admin/roadmap/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || "Falha ao atualizar");
      return false;
    }
    await mutate();
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/app/roadmap"),
      undefined,
      { revalidate: true }
    );
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-primary" />
          <h1 className="text-2xl font-bold">Laboratório Beta</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo item de roadmap
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:w-64">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {ROADMAP_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead className="text-center">
                <ArrowUpCircle className="size-4 inline" />
              </TableHead>
              <TableHead className="text-center">
                <MessageCircle className="size-4 inline" />
              </TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum item encontrado
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[280px] truncate font-medium">
                    {item.title}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.status}
                      onValueChange={(v) =>
                        handlePatch(item.id, { status: v as RoadmapStatus })
                      }
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROADMAP_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.source === "admin" ? "Oficial" : "Sugestão"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.source === "admin" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : item.isAnonymous || !item.authorEmail ? (
                      <span className="text-xs italic text-muted-foreground">
                        Anônimo
                      </span>
                    ) : (
                      <div className="text-xs">
                        <div>{item.authorName || "—"}</div>
                        <div className="text-muted-foreground">{item.authorEmail}</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">{item.upvotes}</TableCell>
                  <TableCell className="text-center text-sm">
                    {item.commentsCount}
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é irreversível. Votos e comentários também serão
                              excluídos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                            >
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

      <CreateItemModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          mutate();
          globalMutate(
            (key) => typeof key === "string" && key.startsWith("/api/app/roadmap"),
            undefined,
            { revalidate: true }
          );
        }}
      />

      <EditItemModal
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={async (patch) => {
          if (!editItem) return;
          const ok = await handlePatch(editItem.id, patch);
          if (ok) setEditItem(null);
        }}
      />
    </div>
  );
}

function CreateItemModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<RoadmapStatus>("planned");
  const [category, setCategory] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/super-admin/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          category: category || undefined,
          adminNotes: adminNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Falha ao criar");
        return;
      }
      toast.success("Item criado");
      setTitle("");
      setDescription("");
      setStatus("planned");
      setCategory("");
      setAdminNotes("");
      onOpenChange(false);
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModalWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="Novo item de roadmap"
      description="Itens criados aqui aparecem na aba Roadmap dos usuários beta."
      isSubmitting={busy}
      onSubmit={submit}
      submitLabel="Criar"
      size="lg"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={4000}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RoadmapStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROADMAP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria (opcional)</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={60}
              placeholder="Ex.: Relatórios"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Nota da equipe (opcional)</Label>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Contexto adicional visível aos betas"
          />
        </div>
      </div>
    </FormModalWrapper>
  );
}

function EditItemModal({
  item,
  onClose,
  onSave,
}: {
  item: AdminItem | null;
  onClose: () => void;
  onSave: (patch: {
    title?: string;
    description?: string;
    status?: RoadmapStatus;
    category?: string | null;
    adminNotes?: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusState, setStatusState] = useState<RoadmapStatus>("voting");
  const [category, setCategory] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description);
      setStatusState(item.status);
      setCategory(item.category ?? "");
      setAdminNotes(item.adminNotes ?? "");
    }
  }, [item]);

  const handleClose = () => onClose();

  const submit = async () => {
    if (!item) return;
    setBusy(true);
    try {
      await onSave({
        title,
        description,
        status: statusState,
        category: category || null,
        adminNotes: adminNotes || null,
      });
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModalWrapper
      open={!!item}
      onOpenChange={(o) => !o && handleClose()}
      title={item ? `Editar: ${item.title}` : "Editar"}
      description={
        item?.source === "user"
          ? "Sugestão de usuário — você pode ajustar o texto e promover o status."
          : "Item do roadmap oficial."
      }
      isSubmitting={busy}
      onSubmit={submit}
      submitLabel="Salvar"
      size="lg"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={4000}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={statusState}
              onValueChange={(v) => setStatusState(v as RoadmapStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROADMAP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={60}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Nota da equipe</Label>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </div>
      </div>
    </FormModalWrapper>
  );
}
