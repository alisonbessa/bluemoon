"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Loader2, CheckCircle, XCircle, CloudUpload, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/ui/alert";

interface SyncStripeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  hasMonthly: boolean;
  hasYearly: boolean;
  hasOnetime: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  onetimePrice: number;
  currentMonthlyPriceId: string | null;
  currentYearlyPriceId: string | null;
  currentOnetimePriceId: string | null;
  onSyncComplete?: () => void;
}

interface SyncResult {
  success: boolean;
  productId?: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
  onetimePriceId?: string;
  error?: string;
}

export function SyncStripeModal({
  open,
  onOpenChange,
  planId,
  planName,
  hasMonthly,
  hasYearly,
  hasOnetime,
  monthlyPrice,
  yearlyPrice,
  onetimePrice,
  currentMonthlyPriceId,
  currentYearlyPriceId,
  currentOnetimePriceId,
  onSyncComplete,
}: SyncStripeModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/super-admin/plans/${planId}/sync-stripe`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync");
      }

      setResult(data);
      onSyncComplete?.();
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const hasSyncedPrices = Boolean(
    currentMonthlyPriceId || currentYearlyPriceId || currentOnetimePriceId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            Sincronizar com Stripe
          </DialogTitle>
          <DialogDescription>
            Cria automaticamente o produto e os preços no Stripe para o plano{" "}
            <strong>{planName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview of what will be created */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium text-sm">O que será criado/atualizado:</h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Produto Stripe</span>
                <Badge variant="outline">{planName}</Badge>
              </div>

              {hasMonthly && monthlyPrice > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Preço Mensal</span>
                  <div className="flex items-center gap-2">
                    <span>{formatPrice(monthlyPrice)}/mês</span>
                    {currentMonthlyPriceId && (
                      <Badge variant="secondary" className="text-xs">
                        Atualizar
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {hasYearly && yearlyPrice > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Preço Anual</span>
                  <div className="flex items-center gap-2">
                    <span>{formatPrice(yearlyPrice)}/ano</span>
                    {currentYearlyPriceId && (
                      <Badge variant="secondary" className="text-xs">
                        Atualizar
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {hasOnetime && onetimePrice > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Preço Único</span>
                  <div className="flex items-center gap-2">
                    <span>{formatPrice(onetimePrice)}</span>
                    {currentOnetimePriceId && (
                      <Badge variant="secondary" className="text-xs">
                        Atualizar
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-muted-foreground">Trial Period</span>
                <Badge>30 dias</Badge>
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-2">
                    <p>Sincronização concluída com sucesso!</p>
                    <div className="text-xs space-y-1">
                      {result.productId && (
                        <p>
                          Produto:{" "}
                          <code className="bg-muted px-1 rounded">
                            {result.productId}
                          </code>
                        </p>
                      )}
                      {result.monthlyPriceId && (
                        <p>
                          Mensal:{" "}
                          <code className="bg-muted px-1 rounded">
                            {result.monthlyPriceId}
                          </code>
                        </p>
                      )}
                      {result.yearlyPriceId && (
                        <p>
                          Anual:{" "}
                          <code className="bg-muted px-1 rounded">
                            {result.yearlyPriceId}
                          </code>
                        </p>
                      )}
                      {result.onetimePriceId && (
                        <p>
                          Único:{" "}
                          <code className="bg-muted px-1 rounded">
                            {result.onetimePriceId}
                          </code>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p>{result.error}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for existing prices */}
          {hasSyncedPrices && !result && (
            <Alert>
              <AlertDescription className="text-xs">
                Este plano já possui preços sincronizados. Se os valores
                mudaram, novos preços serão criados e os antigos serão
                arquivados no Stripe.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {result?.success && (
            <Button variant="outline" asChild>
              <a
                href="https://dashboard.stripe.com/products"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver no Stripe
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result?.success ? "Fechar" : "Cancelar"}
          </Button>
          {!result?.success && (
            <Button onClick={handleSync} disabled={isSyncing}>
              {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSyncing ? "Sincronizando..." : "Sincronizar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
