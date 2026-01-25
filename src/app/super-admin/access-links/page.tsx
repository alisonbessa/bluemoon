"use client";

import { useState } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import {
  AlertTriangle,
  MoreVertical,
  ExternalLink,
  Copy,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import useSWR from "swr";
import { GenerateModal } from "./components/generate-modal";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { Pagination } from "@/shared/ui/pagination";
import Link from "next/link";
import { toast } from "sonner";

interface AccessLink {
  id: string;
  code: string;
  type: "lifetime" | "beta";
  planType: "solo" | "duo" | null;
  userId: string | null;
  usedAt: string | null;
  createdBy: string | null;
  note: string | null;
  expired: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface AccessLinksResponse {
  links: AccessLink[];
  totalItems: number;
  page: number;
  limit: number;
}

type StatusFilter = "all" | "used" | "unused" | "expired";
type TypeFilter = "all" | "lifetime" | "beta";

export default function AccessLinksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data, isLoading, mutate } = useSWR<AccessLinksResponse>(
    `/api/super-admin/access-links?page=${page}&search=${debouncedSearch}&status=${statusFilter}&type=${typeFilter}`
  );

  const expireLink = async (id: string) => {
    try {
      const response = await fetch(`/api/super-admin/access-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expired: true }),
      });

      if (!response.ok) throw new Error("Falha ao expirar link");

      toast.success("Link expirado com sucesso");
      mutate();
    } catch (error) {
      toast.error("Erro ao expirar link");
      console.error(error);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const response = await fetch(`/api/super-admin/access-links/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Falha ao deletar link");

      toast.success("Link deletado com sucesso");
      mutate();
    } catch (error) {
      toast.error("Erro ao deletar link");
      console.error(error);
    }
  };

  const copyRedeemUrl = async (code: string) => {
    const url = `${window.location.origin}/redeem/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const formatCode = (code: string) => {
    // Format as XXXX-XXXX-XXXX
    return code.match(/.{1,4}/g)?.join("-") || code;
  };

  const getStatusBadge = (link: AccessLink) => {
    if (link.expired) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (link.usedAt) {
      return <Badge variant="secondary">Usado</Badge>;
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    return <Badge variant="default">Ativo</Badge>;
  };

  const getTypeBadge = (type: "lifetime" | "beta") => {
    if (type === "lifetime") {
      return <Badge variant="outline" className="text-amber-600 border-amber-600">Lifetime</Badge>;
    }
    return <Badge variant="outline" className="text-blue-600 border-blue-600">Beta</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Links de Acesso</h1>
        <p className="text-muted-foreground">
          Gerencie links de acesso lifetime e beta para usuários especiais
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full sm:w-auto">
          <Input
            placeholder="Buscar por código ou nota..."
            className="max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value: StatusFilter) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="used">Usados</SelectItem>
                <SelectItem value="unused">Disponíveis</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value: TypeFilter) => setTypeFilter(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="lifetime">Lifetime</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <GenerateModal onSuccess={() => mutate()} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usado por</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : data?.links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Nenhum link encontrado
                </TableCell>
              </TableRow>
            ) : (
              data?.links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => copyRedeemUrl(link.code)}
                            className="font-mono text-sm flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            {formatCode(link.code)}
                            <Copy className="h-3 w-3 opacity-50" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Clique para copiar link</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>{getTypeBadge(link.type)}</TableCell>
                  <TableCell>
                    {link.planType ? (
                      <span className="capitalize">{link.planType}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(link)}</TableCell>
                  <TableCell>
                    {link.userId ? (
                      <Link
                        href={`/super-admin/users/${link.userId}`}
                        className="flex items-center text-primary hover:underline text-sm"
                      >
                        {link.userId.substring(0, 8)}...
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {link.note ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="max-w-[150px] truncate block text-left">
                            {link.note}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]">
                            {link.note}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(link.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyRedeemUrl(link.code)}>
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Copiar Link
                        </DropdownMenuItem>
                        {!link.expired && !link.usedAt && (
                          <DropdownMenuItem
                            onClick={() => expireLink(link.id)}
                            className="text-amber-600"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Expirar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm("Tem certeza que deseja deletar este link?")) {
                              deleteLink(link.id);
                            }
                          }}
                          className="text-destructive"
                        >
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <Pagination
          page={page}
          pageSize={data.limit}
          total={data.totalItems}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
