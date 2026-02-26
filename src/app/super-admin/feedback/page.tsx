"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Input } from "@/shared/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Bug,
  Lightbulb,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  Eye,
  RotateCcw,
} from "lucide-react";

interface Feedback {
  id: string;
  userId: string;
  type: "bug" | "suggestion" | "other";
  message: string;
  page: string | null;
  status: "new" | "read" | "resolved";
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

interface PaginationInfo {
  total: number;
  pageCount: number;
  currentPage: number;
  perPage: number;
}

const typeConfig = {
  bug: { label: "Bug", icon: Bug, variant: "destructive" as const },
  suggestion: { label: "Sugestão", icon: Lightbulb, variant: "default" as const },
  other: { label: "Outro", icon: HelpCircle, variant: "secondary" as const },
};

const statusConfig = {
  new: { label: "Novo", variant: "default" as const },
  read: { label: "Lido", variant: "secondary" as const },
  resolved: { label: "Resolvido", variant: "outline" as const },
};

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const limit = 10;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(typeFilter && { type: typeFilter }),
    ...(statusFilter && { status: statusFilter }),
  });

  const swrKey = `/api/super-admin/feedback?${queryParams.toString()}`;

  const { data, error, isLoading } = useSWR<{
    feedbacks: Feedback[];
    pagination: PaginationInfo;
  }>(swrKey);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleOpenFeedback = async (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    if (feedback.status === "new") {
      try {
        await fetch("/api/super-admin/feedback", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: feedback.id, status: "read" }),
        });
        mutate(swrKey);
      } catch (error) {
        console.error("Error marking feedback as read:", error);
      }
    }
  };

  const handleUpdateStatus = async (feedback: Feedback, newStatus: string) => {
    try {
      await fetch("/api/super-admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feedback.id, status: newStatus }),
      });
      mutate(swrKey);
      if (selectedFeedback?.id === feedback.id) {
        setSelectedFeedback({ ...feedback, status: newStatus as Feedback["status"] });
      }
    } catch (error) {
      console.error("Error updating feedback status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/super-admin/feedback?id=${id}`, {
        method: "DELETE",
      });
      setSelectedFeedback(null);
      mutate(swrKey);
    } catch (error) {
      console.error("Error deleting feedback:", error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  const TypeIcon = ({ type }: { type: Feedback["type"] }) => {
    const config = typeConfig[type];
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl font-bold">Feedback dos Usuários</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val === "all" ? "" : val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="suggestion">Sugestão</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val === "all" ? "" : val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="new">Novo</SelectItem>
              <SelectItem value="read">Lido</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[60px]">Tipo</TableHead>
              <TableHead className="min-w-[180px]">Usuário</TableHead>
              <TableHead className="min-w-[200px]">Mensagem</TableHead>
              <TableHead className="min-w-[100px]">Página</TableHead>
              <TableHead className="min-w-[120px]">Data</TableHead>
              <TableHead className="min-w-[90px]">Status</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-red-500">
                  Erro ao carregar feedback
                </TableCell>
              </TableRow>
            ) : data?.feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhum feedback encontrado
                </TableCell>
              </TableRow>
            ) : (
              data?.feedbacks.map((feedback) => (
                <TableRow key={feedback.id} className={feedback.status === "new" ? "font-medium" : ""}>
                  <TableCell>
                    <Badge variant={typeConfig[feedback.type].variant} className="gap-1">
                      <TypeIcon type={feedback.type} />
                      {typeConfig[feedback.type].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{feedback.userName || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {feedback.userEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {feedback.message}
                  </TableCell>
                  <TableCell>
                    {feedback.page ? (
                      <span className="text-xs text-muted-foreground font-mono">
                        {feedback.page}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(feedback.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[feedback.status].variant}>
                      {statusConfig[feedback.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenFeedback(feedback)}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data?.pagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Mostrando {data.pagination.total === 0 ? 0 : (page - 1) * limit + 1} a{" "}
            {Math.min(page * limit, data.pagination.total)} de{" "}
            {data.pagination.total} feedbacks
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {data.pagination.pageCount || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= data.pagination.pageCount}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="w-[95vw] max-w-[600px] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Feedback
              {selectedFeedback && (
                <Badge variant={typeConfig[selectedFeedback.type].variant} className="gap-1">
                  <TypeIcon type={selectedFeedback.type} />
                  {typeConfig[selectedFeedback.type].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <div className="font-medium text-muted-foreground">Usuário:</div>
                <div>{selectedFeedback.userName || "—"}</div>
                <div className="font-medium text-muted-foreground">Email:</div>
                <div>{selectedFeedback.userEmail}</div>
                <div className="font-medium text-muted-foreground">Página:</div>
                <div className="font-mono text-xs">
                  {selectedFeedback.page || "—"}
                </div>
                <div className="font-medium text-muted-foreground">Data:</div>
                <div>{formatDate(selectedFeedback.createdAt)}</div>
                <div className="font-medium text-muted-foreground">Status:</div>
                <div>
                  <Badge variant={statusConfig[selectedFeedback.status].variant}>
                    {statusConfig[selectedFeedback.status].label}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Mensagem:</div>
                <div className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-4 text-sm">
                  {selectedFeedback.message}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {selectedFeedback?.status !== "new" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedFeedback && handleUpdateStatus(selectedFeedback, "new")}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Marcar como novo
                </Button>
              )}
              {selectedFeedback?.status !== "read" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedFeedback && handleUpdateStatus(selectedFeedback, "read")}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Marcar como lido
                </Button>
              )}
              {selectedFeedback?.status !== "resolved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedFeedback && handleUpdateStatus(selectedFeedback, "resolved")}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Resolver
                </Button>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Feedback</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => selectedFeedback && handleDelete(selectedFeedback.id)}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
