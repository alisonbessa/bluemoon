"use client";

import { useState } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
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
import { AlertTriangle, MoreVertical, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import useSWR from "swr";
import { GenerateModal } from "./components/generate-modal";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { Pagination } from "@/shared/ui/pagination";
import Link from "next/link";
import { ExpireCouponsModal } from "./components/expire-coupons-modal";
import { ExportCouponsModal } from "./components/export-coupons-modal";

interface Coupon {
  id: string;
  code: string;
  createdAt: string;
  usedAt: string | null;
  userId: string | null;
  expired: boolean;
}

interface CouponsResponse {
  coupons: Coupon[];
  totalItems: number;
  page: number;
  limit: number;
}

type StatusFilter = "all" | "used" | "unused" | "expired";

export default function CouponsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data, isLoading, mutate } = useSWR<CouponsResponse>(
    `/api/super-admin/coupons?page=${page}&search=${debouncedSearch}&status=${statusFilter}`,
  );

  // Function to expire coupon
  const expireCoupon = async (id: string) => {
    try {
      const response = await fetch(`/api/super-admin/coupons/${id}`, {
        method: "PATCH",
      });

      if (!response.ok) throw new Error("Failed to expire coupon");

      mutate(); // Refresh the data
    } catch (error) {
      console.error("Error expiring coupon:", error);
    }
  };

  // Function to delete coupon
  const deleteCoupon = async (id: string) => {
    try {
      const response = await fetch(`/api/super-admin/coupons/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete coupon");

      mutate(); // Refresh the data
    } catch (error) {
      console.error("Error deleting coupon:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cupons Lifetime Deal</h1>
        <p className="text-muted-foreground">
          Útil para campanhas de lifetime deal em plataformas como AppSumo
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Buscar cupons..."
            className="max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Cupons</SelectItem>
              <SelectItem value="used">Usados</SelectItem>
              <SelectItem value="unused">Disponíveis</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportCouponsModal currentFilter={statusFilter} searchQuery={debouncedSearch} />
          <ExpireCouponsModal onSuccess={() => mutate()} />
          <GenerateModal onSuccess={() => mutate()} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Usado por</TableHead>
              <TableHead>Usado em</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : data?.coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Nenhum cupom encontrado
                </TableCell>
              </TableRow>
            ) : (
              data?.coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono">{coupon.code}</TableCell>
                  <TableCell>
                    {format(new Date(coupon.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {coupon.userId ? (
                      <Link
                        href={`/super-admin/users/${coupon.userId}`}
                        className="flex items-center text-primary hover:underline"
                      >
                        {coupon.userId.substring(0, 8)}...
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {coupon.usedAt
                      ? format(new Date(coupon.usedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {coupon.expired ? (
                      <span className="text-destructive">Expirado</span>
                    ) : coupon.usedAt ? (
                      <span className="text-muted-foreground">Usado</span>
                    ) : (
                      <span className="text-primary">Ativo</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">Abrir menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!coupon.expired && !coupon.usedAt && (
                          <DropdownMenuItem
                            onClick={() => expireCoupon(coupon.id)}
                            className="text-destructive"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Expirar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este cupom?")) {
                              deleteCoupon(coupon.id);
                            }
                          }}
                          className="text-destructive"
                        >
                          Excluir
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