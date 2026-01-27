"use client";

import { useState } from "react";
import useSWR from "swr";
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
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Cloud,
  CloudOff,
  Loader2,
  Sparkles,
  CloudUpload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SyncStripeModal } from "./components/sync-stripe-modal";

interface Plan {
  id: string;
  name: string;
  codename: string;
  default: boolean;
  isLifetime: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  onetimePrice: number;
  monthlyStripePriceId: string | null;
  yearlyStripePriceId: string | null;
  onetimeStripePriceId: string | null;
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  pageCount: number;
  currentPage: number;
  perPage: number;
}

interface StripeStatus {
  connected: boolean;
  mode: "test" | "live" | "unknown";
  account?: {
    id: string;
    name: string | null;
    email: string | null;
    country: string | null;
  };
  products: {
    total: number;
    active: number;
  };
  prices: {
    total: number;
    active: number;
  };
  webhooks: {
    configured: boolean;
    endpoints: Array<{
      id: string;
      url: string;
      status: string;
      enabledEvents: number;
    }>;
  };
  error?: string;
}

export default function PlansPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedPlanForSync, setSelectedPlanForSync] = useState<Plan | null>(null);
  const limit = 10;

  const { data, error, isLoading, mutate } = useSWR<{
    plans: Plan[];
    pagination: PaginationInfo;
  }>(`/api/super-admin/plans?page=${page}&limit=${limit}&search=${search}`);

  const { data: stripeStatus, isLoading: isLoadingStripe, mutate: mutateStripe } = useSWR<StripeStatus>(
    "/api/super-admin/stripe-status"
  );

  const handleSeedPlans = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch("/api/super-admin/plans/seed", {
        method: "POST",
      });
      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || "Planos criados com sucesso!");
        mutate();
      } else {
        toast.error(result.error || "Erro ao criar planos");
      }
    } catch (error) {
      console.error("Error seeding plans:", error);
      toast.error("Erro ao criar planos");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleOpenSyncModal = (plan: Plan) => {
    setSelectedPlanForSync(plan);
    setSyncModalOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-4">
      {/* Status do Stripe */}
      <Card className={stripeStatus?.connected ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Status do Stripe</CardTitle>
              {stripeStatus?.mode && (
                <Badge variant={stripeStatus.mode === "live" ? "destructive" : "secondary"}>
                  {stripeStatus.mode === "live" ? "Produção" : stripeStatus.mode === "test" ? "Teste" : "Desconhecido"}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mutateStripe()}
              disabled={isLoadingStripe}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingStripe ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <CardDescription>
            Verifique se as chaves de API e webhooks estão configurados corretamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStripe ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando conexão...</span>
            </div>
          ) : stripeStatus?.error ? (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <div>
                <span className="font-medium">Erro de Conexão: </span>
                <span>{stripeStatus.error}</span>
              </div>
            </div>
          ) : stripeStatus?.connected ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {/* API Key Status */}
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">API Conectada</div>
                  <div className="text-xs text-muted-foreground">
                    {stripeStatus.account?.name || stripeStatus.account?.email || stripeStatus.account?.id}
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Produtos</div>
                  <div className="text-xs text-muted-foreground">
                    {stripeStatus.products.active} ativos de {stripeStatus.products.total}
                  </div>
                </div>
              </div>

              {/* Prices */}
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Preços</div>
                  <div className="text-xs text-muted-foreground">
                    {stripeStatus.prices.active} ativos de {stripeStatus.prices.total}
                  </div>
                </div>
              </div>

              {/* Webhooks */}
              <div className="flex items-start gap-3">
                {stripeStatus.webhooks.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-sm">Webhooks</div>
                  <div className="text-xs text-muted-foreground">
                    {stripeStatus.webhooks.configured
                      ? `${stripeStatus.webhooks.endpoints.length} endpoint(s)`
                      : "Não configurado"}
                  </div>
                  {stripeStatus.webhooks.endpoints.length > 0 && (
                    <div className="mt-1">
                      {stripeStatus.webhooks.endpoints.map((ep) => (
                        <div key={ep.id} className="flex items-center gap-1 text-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              ep.status === "enabled" ? "bg-green-500" : "bg-amber-500"
                            }`}
                          />
                          <span className="truncate max-w-[150px]" title={ep.url}>
                            {ep.enabledEvents} eventos
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Stripe não conectado. Verifique sua STRIPE_SECRET_KEY.</span>
            </div>
          )}

          {/* Link to Stripe Dashboard */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {stripeStatus?.mode === "test" && "⚠️ Você está usando chaves de teste. Transações não serão reais."}
              {stripeStatus?.mode === "live" && "✅ Você está usando chaves de produção."}
            </span>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://dashboard.stripe.com/${stripeStatus?.mode === "test" ? "test/" : ""}products`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Stripe
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl font-bold">Planos</h1>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar planos..."
              className="pl-8"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleSeedPlans}
            disabled={isSeeding}
          >
            {isSeeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Criar Padrões
          </Button>
          <Button className="w-full sm:w-auto" asChild>
            <Link href="/super-admin/plans/create">
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Link>
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Nome</TableHead>
              <TableHead className="min-w-[120px]">Código</TableHead>
              <TableHead className="min-w-[100px]">Mensal</TableHead>
              <TableHead className="min-w-[100px]">Anual</TableHead>
              <TableHead className="min-w-[100px]">Único</TableHead>
              <TableHead className="min-w-[80px]">Stripe</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Criado em</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-red-500">
                  Erro ao carregar planos
                </TableCell>
              </TableRow>
            ) : data?.plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Nenhum plano encontrado
                </TableCell>
              </TableRow>
            ) : (
              data?.plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="font-medium">{plan.name}</div>
                  </TableCell>
                  <TableCell>{plan.codename}</TableCell>
                  <TableCell>{formatPrice(plan.monthlyPrice)}</TableCell>
                  <TableCell>{formatPrice(plan.yearlyPrice)}</TableCell>
                  <TableCell>{formatPrice(plan.onetimePrice)}</TableCell>
                  <TableCell>
                    {plan.monthlyStripePriceId ||
                    plan.yearlyStripePriceId ||
                    plan.onetimeStripePriceId ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Cloud className="h-4 w-4" />
                        <span className="text-xs">Sincronizado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CloudOff className="h-4 w-4" />
                        <span className="text-xs">Pendente</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {plan.default && (
                        <Badge variant="default">Padrão</Badge>
                      )}
                      {plan.isLifetime && (
                        <Badge variant="secondary">Vitalício</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(plan.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/super-admin/plans/${plan.id}/edit`)
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenSyncModal(plan)}
                        >
                          <CloudUpload className="h-4 w-4 mr-2" />
                          Sincronizar Stripe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            // TODO: Add delete confirmation
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
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

      {data?.pagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Exibindo {(page - 1) * limit + 1} a{" "}
            {Math.min(page * limit, data.pagination.total)} de{" "}
            {data.pagination.total} planos
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

      {/* Modal de Sincronização com Stripe */}
      {selectedPlanForSync && (
        <SyncStripeModal
          open={syncModalOpen}
          onOpenChange={(open) => {
            setSyncModalOpen(open);
            if (!open) setSelectedPlanForSync(null);
          }}
          planId={selectedPlanForSync.id}
          planName={selectedPlanForSync.name}
          hasMonthly={selectedPlanForSync.monthlyPrice > 0}
          hasYearly={selectedPlanForSync.yearlyPrice > 0}
          hasOnetime={selectedPlanForSync.onetimePrice > 0}
          monthlyPrice={selectedPlanForSync.monthlyPrice}
          yearlyPrice={selectedPlanForSync.yearlyPrice}
          onetimePrice={selectedPlanForSync.onetimePrice}
          currentMonthlyPriceId={selectedPlanForSync.monthlyStripePriceId}
          currentYearlyPriceId={selectedPlanForSync.yearlyStripePriceId}
          currentOnetimePriceId={selectedPlanForSync.onetimeStripePriceId}
          onSyncComplete={() => mutate()}
        />
      )}
    </div>
  );
}
