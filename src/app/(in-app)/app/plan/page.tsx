"use client";

import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { ArrowUpRight, HelpCircle, TicketCheck } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import Link from "next/link";
import { useCurrentPlan, useUser } from "@/shared/hooks/use-current-user";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BillingSettingsPage() {
  const { currentPlan, isLoading, error } = useCurrentPlan();
  const { user } = useUser();
  const router = useRouter();
  // Check if organization has a plan with quotas
  const plan = currentPlan;
  const quotas = plan?.quotas;

  // Determine subscription status
  const hasSubscription = plan && !plan.default;

  useEffect(() => {
    if (isLoading) return;
    if (!currentPlan) {
      toast.info("Você precisa assinar um plano para continuar");
      router.push("/#pricing");
    }
  }, [currentPlan, router, isLoading]);

  // Function to render quota features
  const renderQuotaFeatures = () => {
    if (!quotas) return null;

    // Convert quotas object to array for mapping
    const quotaItems = Object.entries(quotas).map(([key, value]) => {
      // Format the key for display
      const displayName = key
        .replace(/([A-Z])/g, " $1") // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter

      // Format the value based on its type
      let displayValue;
      if (typeof value === "boolean") {
        // Show true/false values as Yes/No
        displayValue = value ? "Sim" : "Não";
      } else if (typeof value === "number") {
        // Show numbers as-is
        displayValue = value.toLocaleString();
      } else {
        // Show strings as-is
        displayValue = value;
      }

      return (
        <div
          key={key}
          className="flex items-center justify-between py-2 border-b last:border-0"
        >
          <div className="font-medium text-sm">{displayName}</div>
          <div className="text-sm">{displayValue}</div>
        </div>
      );
    });

    return quotaItems.length > 0 ? (
      <div className="space-y-0 divide-y">{quotaItems}</div>
    ) : (
      <p className="text-sm text-muted-foreground">
        Nenhuma informação de funcionalidades disponível.
      </p>
    );
  };

  // Since UserOrganizationWithPlan doesn't have customer IDs,
  // we'll just show a contact support message instead
  const customerIdSection = (
    <div className="mt-4 pt-4 border-t">
      <p className="text-xs text-muted-foreground">
        Precisa de ajuda com sua assinatura? Entre em contato com o suporte e mencione
        seu ID de usuário:
        <span className="font-mono ml-1 bg-muted px-1 py-0.5 rounded-sm text-xs">
          {user?.id || "Não disponível"}
        </span>
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Assinatura e Uso</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie sua assinatura e monitore o uso de recursos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plano Atual</CardTitle>
            <CardDescription>
              Seu plano de assinatura e detalhes de cobrança.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">
                Erro ao carregar detalhes do plano. Atualize a página.
              </p>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {plan?.name || "Plano Gratuito"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {!hasSubscription && (
                        <span>Funcionalidades e recursos limitados</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={hasSubscription ? "default" : "outline"}
                    className="capitalize"
                  >
                    {hasSubscription ? "ativo" : "gratuito"}
                  </Badge>
                </div>
                {customerIdSection}
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/app/billing">
                Gerenciar Assinatura
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/contact">
                Obter Ajuda
                <HelpCircle className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/app/redeem-ltd">
                Resgatar Código LTD
                <TicketCheck className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seu Plano Inclui</CardTitle>
            <CardDescription>
              Funcionalidades e recursos incluídos no seu plano atual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">
                Erro ao carregar funcionalidades do plano. Atualize a página.
              </p>
            ) : (
              renderQuotaFeatures()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
